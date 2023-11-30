import * as vscode from "vscode";
import { consentForm, consentFormPersonal, survey, thankYou } from "./forms";
import { languages } from "vscode";
import * as errorviz from "./errorviz";
import { log } from "./util";
import { codeFuncMap } from "./visualizations";
import * as fs from "fs";
import * as path from "path";
import TelemetryReporter from '@vscode/extension-telemetry';
//import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";
import * as crypto from 'crypto';

const STUDY = "revis";
let intervalHandle: number | null = null;

const SENDINTERVAL = 10;
const NEWLOGINTERVAL = 1000;
const TWO_WEEKS = 1209600;
const YEAR = 31536000;
const key = "cdf9fbe6-bfd3-438a-a2f6-9eed10994c4e"; //use this key for development
//const key = "0cddc2d3-b3f6-4be5-ba35-dcadf125535c";
const initialStamp = Math.floor(Date.now() / 1000);
let visToggled = false;
let enableExt = true;

let logDir: string | null = null;
let reporter: TelemetryReporter, logPath: string, linecnt: number,
stream: fs.WriteStream, output: vscode.LogOutputChannel, uuid: string;

export function activate(context: vscode.ExtensionContext) {
  if (!vscode.workspace.workspaceFolders) {
    log.error("no workspace folders");
    return;
  }

  //FOR TESTING
  //context.globalState.update("participation", undefined);

  if (logDir === null) {
    logDir = context.globalStorageUri.fsPath;

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
  }

  //have they given an answer to the current consent form?
  //if not, render it!
  if (context.globalState.get("participation") === undefined){
    renderConsentForm(context);
  }
  
  //if logging is enabled, initialize reporter, log file, and line count
  if (vscode.workspace.getConfiguration("salt").get("errorLogging")
      && context.globalState.get("participation") === true){

    //if a year has passed, disable logging
    let startDate = context.globalState.get("startDate");
    if (typeof startDate === 'number' && initialStamp > startDate + YEAR){
      vscode.workspace.getConfiguration("salt").update("errorLogging", false);
      context.globalState.update("participation", undefined);
      return;
    }

    //init telemetry reporter
    reporter = new TelemetryReporter(key);

    //if 2 weeks have passed, re-enable tool
    //otherwise set enabled = false
    if (context.globalState.get("enableRevis") === false){
      if (typeof startDate === 'number' && (initialStamp > startDate + TWO_WEEKS)){
        context.globalState.update("enableRevis", true);
      }
      else {
        enableExt = false;
      }
    }

    [logPath, linecnt, stream] = openLog("");
    output = vscode.window.createOutputChannel("SALT-logger", {log:true});
    uuid = context.globalState.get("uuid") as string;

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
      saveDiagnostics(e);
    })
  );
  context.subscriptions.push(
    vscode.commands.registerTextEditorCommand("salt.toggleVisualization", toggleVisualization)
  );

  //command to render consent form
  context.subscriptions.push(
    vscode.commands.registerCommand("salt.renderConsentForm",
      () => {
        if (context.globalState.get("participation") === true){
          const panel = vscode.window.createWebviewPanel(
            'form',
            'SALT Study Consent Form',
            vscode.ViewColumn.One
          );
          //if already participated, render personal copy
          panel.webview.html = consentFormPersonal;
        }
        else {
          renderConsentForm(context);
        }
    }));

  //command to render survey
  context.subscriptions.push(
    vscode.commands.registerCommand("salt.renderSurvey",
      () => {
        if (context.globalState.get("participation") === true){
          renderSurvey(context);
        }
        else{
          vscode.window
          .showInformationMessage(
            "You may only view the survey after agreeing to the consent form.",
          );
        }
      }));
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
          && context.globalState.get("participation") === true && stream !== undefined){
        //if logging is enabled, wait for diagnostics to load in
        let time = Math.floor(Date.now() / 1000);
        timeoutHandle = setTimeout(() => {
          //log errors
          logError(stream, editor, time, output);
          //increase the buildcount and check if divisible by interval
          linecnt++;
          if (linecnt % SENDINTERVAL === 0){
            sendTelemetry(logPath, reporter);
            if (linecnt >= NEWLOGINTERVAL){
              [logPath, linecnt, stream] = openLog(uuid);
            }
          }
        }, 2000);
      }
    })
  );
}

/**
  * Renders the consent form
  */
function renderConsentForm(context: vscode.ExtensionContext){
  const panel = vscode.window.createWebviewPanel(
    'form',
    'SALT Study Consent Form',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );
  
  panel.webview.html = consentForm;

  panel.webview.onDidReceiveMessage(
    message => {
      if (message.text === "yes"){
        context.globalState.update("participation", true);
        initStudy(context);
        renderSurvey(context);

        //init telemetry reporter and other values
        reporter = new TelemetryReporter(key);
        [logPath, linecnt, stream] = openLog("");
        output = vscode.window.createOutputChannel("SALT-logger", {log:true});
        uuid = context.globalState.get("uuid") as string;
        if (!vscode.env.isTelemetryEnabled){
          vscode.window.showWarningMessage(
            "Please enable telemetry to participate in the study. Do this by going to Code > Settings > Settings and searching for 'telemetry'.");
        }
      }
      else {
        context.globalState.update("participation", false);
      }
      panel.dispose();
    }
  );
}

/**
 * Renders the survey
 */
function renderSurvey(context: vscode.ExtensionContext){
  const panel = vscode.window.createWebviewPanel(
    'form',
    'SALT Survey',
    vscode.ViewColumn.One,
    {
      enableScripts: true
    }
  );

  panel.webview.html = survey;

  panel.webview.onDidReceiveMessage(
    message => {
      context.globalState.update("survey", message.text);
      //write to latest log
      const fileCount = fs.readdirSync(logDir!).filter(f => path.extname(f) === ".json").length;
      const logPath = path.join(logDir!, `log${fileCount}.json`);
      fs.writeFileSync(logPath, JSON.stringify({survey: message.text}) + '\n', {flag: 'a'});
      panel.webview.html = thankYou;
    }
  );
}

/**
 * Initializes variables for the study
 */
function initStudy(context: vscode.ExtensionContext){
  //generate UUID
  const uuid = crypto.randomBytes(16).toString('hex');
  context.globalState.update("uuid", uuid);
  //store uuid in text file for easy access
  fs.writeFileSync(path.join(logDir!, "uuid.txt"), uuid + '\n', {flag: 'a'});

  //generate 50/50 chance of revis being active
  const rand = Math.random();
  if (rand < 0.5){
    //deactivate revis
    context.globalState.update("enableRevis", false);
    enableExt = false;
  }
  else {
    context.globalState.update("enableRevis", true);
    enableExt = true;
  }

  context.globalState.update("startDate", Math.floor(Date.now() / 1000));

  //generate first log file
  fs.writeFileSync(path.join(logDir!, "log1.json"), JSON.stringify({uuid: uuid, logCount: 1, studyEnabled: enableExt}) + '\n', {flag: 'a'});
  //set config to enable logging
  vscode.workspace.getConfiguration("salt").update("errorLogging", true);
}

/**
 * Initializes a new log file
 * @param uuid if we are creating a new log file, "" otherwise
 * @returns path of current log, line count, and the stream
 */
function openLog(uuid: string): [string, number, fs.WriteStream]{
  //find how many json files are in folder to determine current log #
  let fileCount = fs.readdirSync(logDir!)
    .filter(f => path.extname(f) === ".json").length;
  //new logs must provide a UUID
  if (uuid !== ""){
    fileCount++;
  }
  const logPath = path.join(logDir!, `log${fileCount}.json`);
  if (uuid !== ""){
    fs.writeFileSync(logPath, JSON.stringify({uuid: uuid, logCount: fileCount, studyEnabled: enableExt}) + '\n', {flag: 'a'});
  }
  else{
    fs.writeFileSync(logPath, JSON.stringify({extensionReload: {studyEnabled: enableExt}}) + '\n', {flag: 'a'});
  }

  linecnt = 0;
  if (uuid === ""){
    const linecnt = fs.readFileSync(logPath, 'utf-8').split('\n').length;
  }
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
    stream.write(JSON.stringify({error: "not editing rust"}) + "\n");
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
    if (vscode.workspace.getConfiguration("rust-analyzer").get<boolean>("diagnostics.useRustcErrorCode")){
      stream.write(JSON.stringify({error: "rustc errors not found"}) + "\n");
    }
    else {
      stream.write(JSON.stringify({error: "rustc error codes not enabled"}) + "\n");
    }
    return;
  }

  //for every error create a JSON object in the errors list
  let errors = [];
  for (const diag of diagnostics) {
    if (diag.code === undefined || typeof diag.code === "number" || typeof diag.code === "string") {
      log.error("unexpected diag.code type", typeof diag.code);
      stream.write(JSON.stringify({error: "unexpected diag.code type"}) + "\n");
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
  if (!enableExt){
    return;
  }
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
