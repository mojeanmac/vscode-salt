import * as vscode from "vscode";
import { languages } from "vscode";
import * as errorviz from "./errorviz";
import { log } from "./util";
import { codeFuncMap } from "./visualizations";
import * as fs from "fs";
import * as path from "path";
import TelemetryReporter from '@vscode/extension-telemetry';
//import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
//import { FormPanel } from "./research/form";
import * as crypto from 'crypto';
import * as assert from "assert";

const VERSION = "0.1.1";
const STUDY = "revis";
let intervalHandle: number | null = null;

const SENDINTERVAL = 100;
const NEWLOGINTERVAL = 1000;
const TWO_WEEKS = 1209600;
const YEAR = 31536000;
const key = "cdf9fbe6-bfd3-438a-a2f6-9eed10994c4e";
const initialStamp = Math.floor(Date.now() / 1000);
let visToggled = false;
let enableExt = true;

let logDir: string | null = null;

export function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    log.error("no workspace folders");
    return;
  }

  if (logDir === null) {
    logDir = context.globalStorageUri.fsPath;
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    assert(logDir !== null);
  }

  //have they given an answer to the current consent form?
  //if not, render it!
  //if (context.globalState.get("participation") === undefined){
    renderConsentForm(context);
  //}
  
  //if logging is enabled, initialize reporter, log file, and line count
  let reporter: TelemetryReporter, logPath: string, linecnt: number,
      stream: fs.WriteStream, output: vscode.LogOutputChannel, uuid: string;
  if (vscode.workspace.getConfiguration("salt").get("errorLogging")
      && context.globalState.get("participation") === true){

    //if a year has passed, disable logging
    let startDate = context.globalState.get("startDate");
    if (typeof startDate === 'number' && initialStamp > startDate + YEAR){
      vscode.workspace.getConfiguration("salt").update("errorLogging", false);
      context.globalState.update("participation", false);
      return;
    }

    //init telemetry reporter
    reporter = new TelemetryReporter(key);
    context.subscriptions.push(reporter);

    //disable tool if still in study period
    if (context.globalState.get("disableRevis") !== undefined){
      if (typeof startDate === 'number' && initialStamp < startDate + TWO_WEEKS){
        enableExt = false;
      }
      else {
        context.globalState.update("disableRevis", undefined);
      }
    }

    [logPath, linecnt, stream] = openLog(logDir, "");
    output = vscode.window.createOutputChannel("SALT-logger", {log:true});
    
    if (typeof context.globalState.get("uuid") === "string"){
      uuid = context.globalState.get("uuid") as string;
    }

    //check if telemetry is enabled globally
    if (!vscode.env.isTelemetryEnabled){
      vscode.window.showWarningMessage(
        "Please enable telemetry to participate in the study. Do this by going to Code > Settings > Settings and searching for 'telemetry'.");
    }
  }

  //settings.json config to get rustc err code
  const raconfig = vscode.workspace.getConfiguration("rust-analyzer");
  const useRustcErrorCode = raconfig.get<boolean>("diagnostics.useRustcErrorCode");
  if (!useRustcErrorCode) {
    vscode.window
      .showWarningMessage(
        "SALT wants to set `rust-analyzer.diagnostics.useRustcErrorCode` to true in settings.json.",
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
      if (enableExt){
        saveDiagnostics(e);
      }
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("salt.toggleVisualization", toggleVisualization)
  );
  //render consent form
  context.subscriptions.push(
    vscode.commands.registerCommand("salt.renderConsentForm",
      () => {
        if (context.globalState.get("participation") === true){
          const panel = vscode.window.createWebviewPanel(
            'form',
            'SALT Study Consent Form',
            vscode.ViewColumn.One
          );
          panel.webview.html = fs.readFileSync(context.extensionPath + "/src/research/consentformCopy.html", 'utf8');
        }
        else {
          renderConsentForm(context);
        }
    }));
  //render survey
  context.subscriptions.push(
    vscode.commands.registerCommand("salt.renderSurvey",
      () => {if (context.globalState.get("participation") === true){
        renderSurvey(context);
      }}));
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand(
      "salt.clearAllVisualizations",
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

      if (vscode.workspace.getConfiguration("salt").get("errorLogging")
          && context.globalState.get("participation") === true && stream !== null){
        //if logging is enabled, wait for diagnostics to load in
        let time = Math.floor(Date.now() / 1000);
        timeoutHandle = setTimeout(() => {
          //log errors
          logError(stream, editor, time, output);

          //increase the buildcount and check if divisible by some number
          linecnt++;
          if (linecnt % SENDINTERVAL === 0){
            sendTelemetry(logPath, reporter);
            if (linecnt > NEWLOGINTERVAL){
              [logPath, linecnt, stream] = openLog(logDir!, uuid);
            }
          }
        }, 2000);
      }
    })
  );
}

function renderConsentForm(context: vscode.ExtensionContext){
  const panel = vscode.window.createWebviewPanel(
    'form',
    'SALT Study Consent Form',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );
  
  panel.webview.html = fs.readFileSync(context.extensionPath + "/src/research/consentform.html", 'utf8');

  panel.webview.onDidReceiveMessage(
    message => {
      if (message.text === "yes"){
        context.globalState.update("participation", true);
        initStudy(context);
        renderSurvey(context);
      }
      else {
        context.globalState.update("participation", false);
      }
      panel.dispose();
    }
  );
}

function renderSurvey(context: vscode.ExtensionContext){
  const panel = vscode.window.createWebviewPanel(
    'form',
    'SALT Survey',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );

  panel.webview.html = fs.readFileSync(context.extensionPath + "/src/research/survey.html", 'utf8');

  panel.webview.onDidReceiveMessage(
    message => {
      console.log(message.text);
      context.globalState.update("survey", message.text);
      //write to latest log
      const fileCount = fs.readdirSync(logDir!).filter(f => path.extname(f) === ".json").length;
      const logPath = path.join(logDir!, "log", `${fileCount}.json`);
      fs.writeFileSync(logPath, JSON.stringify({survey: message.text}) + '\n', {flag: 'a'});
      panel.webview.html = fs.readFileSync(context.extensionPath + "/src/research/survey.html", 'utf8');
    }
  );
}

/**
 * Generates a UUID for the user and generates a file to randomly
 * determine if revis is activated or not
 */
function initStudy(context: vscode.ExtensionContext){
  //generate UUID
  const uuid = crypto.randomBytes(16).toString('hex');
  context.globalState.update("uuid", uuid);

  //generate 50/50 chance of revis being active
  const rand = Math.floor(Math.random());
  if (rand < 0.5){
    //deactivate revis, set date to reactivate 2 weeks from now
    context.globalState.update("disableRevis", true);
  }

  context.globalState.update("startDate", Math.floor(Date.now() / 1000).toString());

  //generate first log file
  fs.writeFileSync(logDir + "/log1.json", JSON.stringify({uuid: uuid, logCount: 1, studyEnabled: enableExt}) + '\n', {flag: 'a'});
  //set config to enable logging
  vscode.workspace.getConfiguration("salt").update("errorLogging", true);
}

/**
 * Initializes a new log file
 * @param logDir directory for log files
 * @param uuid if we are creating a new log file
 * @returns path of current log, line count, and the stream
 */
function openLog(logDir: string, uuid: string): [string, number, fs.WriteStream]{
  //find how many json files are in folder to determine current log #
  let fileCount = fs.readdirSync(logDir)
    .filter(f => path.extname(f) === ".json").length;
  
  //new logs must provide a UUID
  if (uuid !== ""){
    fileCount++;
  }
  const logPath = logDir + "/log" + fileCount + ".json";
  if (uuid !== ""){
    fs.writeFileSync(logPath, JSON.stringify({uuid: uuid, logCount: fileCount, studyEnabled: enableExt}) + '\n', {flag: 'a'});
  }
  else{
    fs.writeFileSync(logPath, JSON.stringify({extensionReload: {studyEnabled: enableExt}}) + '\n', {flag: 'a'});
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
 * @param editor contains the current rust document
 * @param time to be subtracted from initial time
 */
function logError(stream: fs.WriteStream, editor: vscode.TextEditor, time: number, output: vscode.LogOutputChannel){

  let doc = editor.document;
  //filter for only rust errors
  if (doc.languageId !== "rust") {
    return;
  }

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
  output.append(entry);
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
