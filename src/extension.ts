import * as vscode from "vscode";
import { languages } from "vscode";
import * as errorviz from "./errorviz";
import { log } from "./util";
import { codeFuncMap } from "./visualizations";
import * as fs from "fs";
import * as path from "path";
import TelemetryReporter from '@vscode/extension-telemetry';
import { FormPanel } from "./research/form";
import * as crypto from 'crypto';


const VERSION = "0.1.1";
let intervalHandle: number | null = null;

const SENDINTERVAL = 100;
const NEWLOGINTERVAL = 1000;
const key = "cdf9fbe6-bfd3-438a-a2f6-9eed10994c4e";
const initialStamp = Math.floor(Date.now() / 1000);
let visToggled = false;

export function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    log.error("no workspace folders");
    return;
  }

  const logDir = context.globalStorageUri.fsPath;
  fs.writeFileSync(logDir + "/.revis-version", VERSION);

  //Check if logfile exists, if not create an empty one and render form
  if (!fs.existsSync(logDir + "/log1.json")){
    FormPanel.render();
    fs.writeFileSync(logDir + "/log1.json", "");
  }

  //initialize telemetry reporter
  let reporter = new TelemetryReporter(key);
  context.subscriptions.push(reporter);
  let [logPath, linecnt, stream] = openLog(logDir, false);

  //settings.json config to get rustc err code
  const raconfig = vscode.workspace.getConfiguration("rust-analyzer");
  const useRustcErrorCode = raconfig.get<boolean>("diagnostics.useRustcErrorCode");
  if (!useRustcErrorCode) {
    vscode.window
      .showWarningMessage(
        "revis wants to set `rust-analyzer.diagnostics.useRustcErrorCode` to true in settings.json.",
        "Allow",
        "I'll do it myself"
      )
      .then((sel) => {
        if (sel === "Allow") {
          raconfig.update("diagnostics.useRustcErrorCode", true);
        }
      });
  }

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e === undefined) {
        return;
      }
      saveDiagnostics(e);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("revis.toggleVisualization", toggleVisualization)
  );
  context.subscriptions.push(
    vscode.commands.registerCommand("revis.researchParticipation", FormPanel.render)
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "revis.clearAllVisualizations",
      clearAllVisualizations
    )
  );

  let timeoutHandle: NodeJS.Timeout | null = null;
  context.subscriptions.push(
    languages.onDidChangeDiagnostics((_: vscode.DiagnosticChangeEvent) => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        return;
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
      timeoutHandle = setTimeout(() => {
        saveDiagnostics(editor);
      }, 200);

      //if logging is enabled, wait for diagnostics to load in
      if (vscode.workspace.getConfiguration("revis").get("errorLogging")){
        let time = Math.floor(Date.now() / 1000);
        let doc = editor.document;
        //filter for only rust errors
        if (doc.languageId !== "rust") {
          return;
        }
        timeoutHandle = setTimeout(() => {
          logError(stream, doc, time);

          //increase the buildcount and check if divisible by some number
          linecnt++;
          console.log(linecnt);
          if (linecnt % SENDINTERVAL === 0){
            sendTelemetry(logPath, reporter);
            if (linecnt > NEWLOGINTERVAL){
              [logPath, linecnt, stream] = openLog(logDir, true);
            }
          }
        }, 2000);
      }
    })
  );
}

/**
 * Initializes a new log file
 * @param logDir directory for log files
 * @param newLog if we are creating a new log file
 * @returns path of current log, line count, and the stream
 */
function openLog(logDir: string, newLog: boolean): [string, number, fs.WriteStream]{
  //find how many json files are in folder to determine current log #
  let fileCount = fs.readdirSync(logDir)
    .filter(f => path.extname(f) === ".json").length;
  
  if (newLog){
    fileCount++;
  }

  const logPath = logDir + "/log" + fileCount + ".json";

  if (!newLog){
    fs.writeFileSync(logPath, "{\"extension reload\"}\n", {flag: 'a'});
  }
  else{
    fs.writeFileSync(logPath, "{\"insert new header here, log: "+ fileCount +"\"}\n", {flag: 'a'});
  }

  //count lines in current log
  const linecnt = fs.readFileSync(logPath, 'utf-8').split('\n').length;

  //create new stream
  const stream = fs.createWriteStream(logPath, {flags: 'a'});

  return [logPath, linecnt, stream];
}

/**
 * Sends the log file to the server
 * @param logPath path of log file
 * @param reporter telemetry reporter
 */
function sendTelemetry(logPath: string, reporter: TelemetryReporter){
  const data = fs.readFileSync(logPath, 'utf-8');
  reporter.sendTelemetryEvent('errorLog', {'data': data});
}

/**
 * Creates a JSON object for each build and writes it to the log file
 * @param stream the log file writestream
 * @param doc the current rust document
 * @param time to be subtracted from initial time
 * @returns 
 */
function logError(stream: fs.WriteStream, doc:  vscode.TextDocument, time: number){

  let diagnostics = languages
            .getDiagnostics(doc.uri)
            .filter((d) => {
              return (
                d.severity === vscode.DiagnosticSeverity.Error &&
                typeof d.code === "object" &&
                typeof d.code.value === "string"
              );
            });

  //if there are errors but none are rustc, return
  if (diagnostics.length !== 0 && !diagnostics.some(e => e.source === 'rustc')){
    return;
  }

  //for every error create a JSON object in the errors list
  let errors = [];
  for (const diag of diagnostics) {
    if (diag.code === undefined || typeof diag.code === "number" || typeof diag.code === "string") {
      log.error("unexpected diag.code type", typeof diag.code);
      return;
    }
    let code = diag.code.value;

    //syntax errors dont follow Rust error code conventions
    if (typeof code === "string" && code[0] !== 'E'){
      code = "Syntax";
    }

    //add error data to list
    errors.push({
      code: code,
      msg: hashString(diag.message),
      source: diag.source,
      range:{
        start: diag.range.start.line,
        end: diag.range.end.line
      }
    });
  }

  //write to file
  const entry = JSON.stringify({
    file: hashString(doc.fileName),
    seconds: (time - initialStamp),
    revis: visToggled, 
    errors: errors
  }) + '\n';
  stream.write(entry);
  console.log(entry);
  visToggled = false;
}

/**
 * Hashes + truncates strings to 8 characters
 * @param input string to be hashed
 * @returns hashed string
 */
function hashString(input: string): string {
  const hash = crypto.createHash('sha256');
  hash.update(input);
  return hash.digest('hex').slice(0,8);
}

function saveDiagnostics(editor: vscode.TextEditor) {
  const doc = editor.document;
  if (doc.languageId !== "rust") {
    // only supports rust
    return;
  }
  const diagnostics = languages
    .getDiagnostics(doc.uri)
    // only include _supported_ _rust_ _errors_
    .filter((d) => {
      return (
        d.source === "rustc" &&
        d.severity === vscode.DiagnosticSeverity.Error &&
        typeof d.code === "object" &&
        typeof d.code.value === "string" &&
        codeFuncMap.has(d.code.value)
      );
    });
  const newdiags = new Map<string, errorviz.DiagnosticInfo>();
  const torefresh: string[] = [];
  for (const diag of diagnostics) {
    if (diag.code === undefined || typeof diag.code === "number" || typeof diag.code === "string") {
      log.error("unexpected diag.code type", typeof diag.code);
      return;
    }
    const erridx = diag.range.start.line.toString() + "_" + diag.code.value;
    newdiags.set(erridx, {
      diagnostics: diag,
      displayed: false,
      dectype: null,
      svg: null,
    });
    const odiag = errorviz.G.diags.get(erridx);
    if (odiag?.displayed) {
      // this is a displayed old diagnostics
      torefresh.push(erridx);
    }
  }
  // hide old diags and refresh displayed diagnostics
  errorviz.G.hideAllDiags(editor);
  errorviz.G.diags = newdiags;
  for (const d of torefresh) {
    log.info("reshow", d);
    errorviz.G.showDiag(editor, d);
  }
  errorviz.G.showTriangles(editor);
}

function toggleVisualization(editor: vscode.TextEditor, _: vscode.TextEditorEdit) {
  visToggled = true;
  const currline = editor.selection.active.line;
  const lines = [...errorviz.G.diags.keys()];
  const ontheline = lines.filter((i) => parseInt(i) === currline);
  if (!ontheline) {
    log.info("no diagnostics on line", currline + 1);
    return;
  }
  if (ontheline.length > 1) {
    vscode.window
      .showQuickPick(
        ontheline.map((id) => {
          const diag = errorviz.G.diags.get(id);
          const [line, ecode] = id.split("_", 2);
          const label = `${ecode} on line ${parseInt(line) + 1}`;
          const detail = diag?.diagnostics.message;
          return { label, detail, id };
        })
      )
      .then((selected) => {
        if (selected !== undefined) {
          errorviz.G.toggleDiag(editor, selected.id);
        }
      });
  } else {
    errorviz.G.toggleDiag(editor, ontheline[0]);
  }
}

function clearAllVisualizations(e: vscode.TextEditor, _: vscode.TextEditorEdit) {
  errorviz.G.hideAllDiags(e);
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }
}
