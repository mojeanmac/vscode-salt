import * as vscode from "vscode";

// node builtin modules
import * as crypto from 'crypto';
import * as fs from "fs";
import * as path from "path";

import { printExprs } from "./printRust";
import { openNewLog, openExistingLog, sendPayload, sendBackup, isPrivateRepo } from "./telemetry";
import { renderConsentForm, renderSurvey, renderQuiz } from "./webviews";
import { hashString, logError, countrs} from "./logging_utils";

import { supportedErrorcodes } from "./interventions";
import * as errorviz from "./interventions/errorviz";
import { hideInlineSuggestion, showInlineSuggestions } from "./interventions/inline-suggestions";
import { registerCommands } from './interventions/inline-suggestions/commands';

import { log } from "./utils/log";
import { on } from "events";

let intervalHandle: number | null = null;

const SENDINTERVAL = 25;
const NEWLOGINTERVAL = 1000;
const TWO_WEEKS = 1209600;
const YEAR = 31536000;

const initialStamp = Math.floor(Date.now() / 1000);
let visToggled = false;
let enableExt = true;
let prevline: number | undefined;
let logDir: string | null = null;
let logPath: string, logCount: number, linecnt: number,
stream: fs.WriteStream, output: vscode.LogOutputChannel, uuid: string;

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
  }

  //have they given an answer to the current consent form?
  //if not, render it!
  if (context.globalState.get("participation") === undefined){
    renderConsentForm(context, logDir);
  }

  //one time notif for existing participants to do quiz
  // if (context.globalState.get("quiznotif") === undefined //not yet notified
  //     && context.globalState.get("quiz") === undefined //not done quiz
  //     && context.globalState.get("participation") === true){ //but is a participant
    
    // vscode.window.showInformationMessage("Are you a functional or an imperative programmer? Quiz yourself to find out!", "Take Quiz", "Maybe Later").then((sel) => {
    //   if (sel === "Take Quiz") {
    //     renderQuiz(context, logDir!);
    //   }
    // });
    // context.globalState.update("quiznotif", true);
  // }

  if (context.globalState.get("participation") === true){

    //disable logging for this session if publicOnly is true and not a public repo
    if (vscode.workspace.getConfiguration("salt").get("publicOnly") === true){
      isPrivateRepo(vscode.workspace.workspaceFolders[0].uri.fsPath).then((isPrivate) => {
          context.workspaceState.update("enabled", !isPrivate);
      });
    }
    else {
      context.workspaceState.update("enabled", true);
    }

    //if global enable is undefined, set it to true
    if (context.globalState.get("globalEnable") === undefined){
      vscode.workspace.getConfiguration("salt").update("errorLogging", true, true);
      context.globalState.update("globalEnable", true);
    }

    //call to backup existing logs to aws
    if (context.globalState.get("backedUp") !== 0){
      let startOn;
      if (typeof context.globalState.get("backedUp") === "number"){
        startOn = context.globalState.get("backedUp") as number;
      }
      else {
        startOn = 1;
      }
      sendBackup(startOn, logDir!, context.globalState.get("uuid") as string).then((failedOn) => {;
        if (failedOn === 0) {
          context.globalState.update("backedUp", 0);
        } else {
          context.globalState.update("backedUp", failedOn);
        }
      });
    }
    
    //if logging is enabled, initialize reporter, log file, and line count
    if (vscode.workspace.getConfiguration("salt").get("errorLogging") === true
        && context.workspaceState.get("enabled") === true){

      //if a year has passed, disable logging
      let startDate = context.globalState.get("startDate") as number;
      if (initialStamp > startDate + YEAR){
        vscode.workspace.getConfiguration("salt").update("errorLogging", false);
        context.globalState.update("participation", undefined);
        //remove logdir folder
        fs.rmdirSync(logDir!, {recursive: true});
        return;
      }

      //if 2 weeks have passed, re-enable tool
      //otherwise set enabled = false
      if (context.globalState.get("enableRevis") === false){
        if (initialStamp > startDate + TWO_WEEKS){
          context.globalState.update("enableRevis", true);
        }
        else {
          enableExt = false;
        }
      }

      [logPath, logCount, linecnt, stream] = openExistingLog(logDir, enableExt, initialStamp - startDate);
      output = vscode.window.createOutputChannel("SALT-logger", {log:true});
      uuid = context.globalState.get("uuid") as string;

      //check if telemetry is enabled globally
      if (!vscode.env.isTelemetryEnabled){
        vscode.window.showWarningMessage(
          "Please enable telemetry to participate in the study. Do this by going to Code > Settings > Settings and searching for 'telemetry'.");
      }
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

  //stop logging if publiconly set to true && private
  context.subscriptions.push(
    vscode.workspace.onDidChangeConfiguration(e => {
      if (context.globalState.get("participation") === true 
          && e.affectsConfiguration("salt.publicOnly") 
          && vscode.workspace.workspaceFolders) {
        if (vscode.workspace.getConfiguration("salt").get("publicOnly") === true){
          isPrivateRepo(vscode.workspace.workspaceFolders[0].uri.fsPath).then((isPrivate) => {
            context.workspaceState.update("enabled", !isPrivate);
          });
        }
        else {
          context.workspaceState.update("enabled", true);
        }
      }
    })
  );

  context.subscriptions.push(
    vscode.window.onDidChangeActiveTextEditor((e) => {
      if (e === undefined) {
        return;
      }
      updateInterventions(e);
    })
  );

  // context.subscriptions.push(
  //   vscode.commands.registerTextEditorCommand("salt.toggleVisualization", toggleVisualization)
  // );

  context.subscriptions.push(
    vscode.window.onDidChangeTextEditorSelection((e) =>{
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const currline = editor.selections[0].active.line;
      if (currline !== prevline && currline){
        prevline = currline;
        toggleVisualization(editor);
      }
    })
  );

  context.subscriptions.push(
    vscode.workspace.onDidChangeTextDocument((e) => {
      const editor = vscode.window.activeTextEditor;
      if (!editor) {
        return;
      }
      const changes = e.contentChanges;
      e.contentChanges.forEach((change) => {
        let line = change.range.start.line;
        if (change.text === '*') {
          ammendInlineViz(editor, change);
        }
      });
    })
  );

  //command to render consent form
  context.subscriptions.push(
    vscode.commands.registerCommand("salt.renderConsentForm",
      () => {
        renderConsentForm(context, logDir!);
    }));

  //command to render survey
  context.subscriptions.push(
    vscode.commands.registerCommand("salt.renderSurvey",
      () => {
        if (context.globalState.get("participation") === true){
          renderSurvey(context, logDir!);
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

  // context.subscriptions.push(
  //   vscode.commands.registerCommand("salt.renderQuiz",
  //     () => {
  //       if (context.globalState.get("quiz") !== undefined){
  //         renderQuiz(context, logDir!);
  //       }
  //       else {
  //         vscode.window
  //         .showInformationMessage(
  //           "You've already completed the quiz!",
  //         );
  //       }
  //     }));

  context.subscriptions.push(
    vscode.workspace.onDidSaveTextDocument((_: vscode.TextDocument) => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        return;
      }

      let doc = editor.document;
      if (vscode.workspace.getConfiguration("salt").get("errorLogging") && context.workspaceState.get("enabled") === true
          && context.globalState.get("participation") === true && stream !== undefined){

        const savedMsg = JSON.stringify({
          file: hashString(doc.fileName),
          savedAt: ((Date.now() / 1000) - initialStamp).toFixed(3),
        }) + "\n";
        stream.write(savedMsg);
        output.append(savedMsg);
        linecnt++;

        const exprsWrite = async() => {
          const exprs = await printExprs(context);
          const exprsMsg = JSON.stringify({
            file: hashString(doc.fileName),
            exprs: exprs,
          }) + "\n";
        stream.write(exprsMsg);
        output.append(exprsMsg);
        linecnt++;
        };
        exprsWrite().catch(console.error);

        //send telemetry every SENDINTERVAL lines
        if (linecnt % SENDINTERVAL === 0){
          output.append("Sending telemetry...\n");
          try {
            sendPayload(logPath, uuid, logCount);
            output.append("Telemetry sent.\n");
          }
          catch(e) {
            output.append("Failed to send telemetry.\n" + e);
          }
          if (linecnt >= NEWLOGINTERVAL){
            [logPath, logCount, linecnt, stream] = openNewLog(logDir!, enableExt, uuid);
          }
        }
      };
    })
  );

  let timeoutHandle: NodeJS.Timeout | null = null;
  context.subscriptions.push(
    vscode.languages.onDidChangeDiagnostics((_: vscode.DiagnosticChangeEvent) => {
      const editor = vscode.window.activeTextEditor;
      if (editor === undefined) {
        return;
      }
      let doc = editor.document;
      //filter for only rust errors
      if (doc.languageId !== "rust") {
        return;
      }
      if (timeoutHandle !== null) {
        clearTimeout(timeoutHandle);
      }
      setTimeout(() => {
        updateInterventions(editor);
      }, 200);
      if (vscode.workspace.getConfiguration("salt").get("errorLogging") && context.workspaceState.get("enabled") === true
          && context.globalState.get("participation") === true && stream !== undefined){
        //if logging is enabled, wait for diagnostics to load in
        let time = ((Date.now() / 1000) - initialStamp).toFixed(3);
        timeoutHandle = setTimeout(() => {
          //log errors
          logEvent(doc, time);
        }, 2000);
      }
    })
  );

  registerCommands(context);
}

/**
 * Initializes variables for the study
 */
export function initStudy(context: vscode.ExtensionContext){
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
  
  //set config to enable logging
  vscode.workspace.getConfiguration("salt").update("errorLogging", true, true);
  context.globalState.update("globalEnable", true);

  //init log values
  [logPath, logCount, linecnt, stream] = openNewLog(logDir!, enableExt, uuid);
  output = vscode.window.createOutputChannel("SALT-logger", {log:true});
  if (!vscode.env.isTelemetryEnabled){
    vscode.window.showWarningMessage(
      "Please enable telemetry to participate in the study. Do this by going to Code > Settings > Settings and searching for 'telemetry'.");
  }
}

/**
 * Creates a JSON object for each build and writes it to the log file
 * @param doc contains the current rust document
 * @param time to be subtracted from initial time
 */
function logEvent(doc: vscode.TextDocument, time: string){

  let diagnostics = vscode.languages
    .getDiagnostics(doc.uri)
    .filter((d) => {
      return (
        d.severity === vscode.DiagnosticSeverity.Error &&
        typeof d.code === "object" &&
        typeof d.code.value === "string"
      );
    });

  let errors = logError(diagnostics);

  //get linecount of codebase
  countrs().then((count) => {
    //write to file
    const entry = JSON.stringify({
      file: hashString(doc.fileName),
      workspace: hashString(vscode.workspace.name!),
      seconds: time,
      revis: visToggled,
      length: doc.lineCount,
      numfiles: count,
      errors: errors
    }) + '\n';
    stream.write(entry);
    output.append(entry);
    linecnt++;
    visToggled = false;
  });
}

function updateInterventions(editor: vscode.TextEditor) {
  if (!enableExt){
    return;
  }
  const doc = editor.document;
  if (doc.languageId !== "rust") {
    // only supports rust
    return;
  }
  const diagnostics = vscode.languages
    .getDiagnostics(doc.uri)
    // only include _supported_ _rust_ _errors_
    .filter((d) => {
      return (
        d.source === "rustc" &&
        d.severity === vscode.DiagnosticSeverity.Error &&
        typeof d.code === "object" &&
        typeof d.code.value === "string" &&
        supportedErrorcodes.has(d.code.value)
      );
    });
  
  saveDiagnostics(editor, diagnostics);
  showInlineSuggestions(editor, diagnostics, );
}

/**
 * revis
 */
function saveDiagnostics(editor: vscode.TextEditor, diagnostics: vscode.Diagnostic[]) {
  const newdiags: Array<[string, errorviz.DiagnosticInfo]> = [];
  const torefresh: string[] = [];
  for (const diag of diagnostics) {
    if (diag.code === undefined || typeof diag.code === "number" || typeof diag.code === "string") {
      log.error("unexpected diag.code type", typeof diag.code);
      return;
    }
    const erridx = diag.range.start.line.toString() + "_" + diag.code.value;
    newdiags.push([erridx, {
      diagnostics: diag,
      displayed: false,
      dectype: null,
      svg: null,
    }]);
    const odiag = errorviz.diags.get(erridx);
    if (odiag?.displayed) {
      // this is a displayed old diagnostics
      torefresh.push(erridx);
    }
  }
  // hide old diags and refresh displayed diagnostics
  errorviz.hideAllDiags(editor);
  errorviz.diags.clear();
  newdiags.forEach(([k, v]) => errorviz.diags.set(k, v));
  for (const d of torefresh) {
    log.info("reshow", d);
    errorviz.showDiag(editor, d);
  }
  errorviz.showTriangles(editor);
  //toggleFirstViz(editor);
}

function toggleVisualization(editor: vscode.TextEditor) {
  visToggled = true;
  const currline = editor.selection.active.line;
  const lines = [...errorviz.diags.keys()];
  const ontheline = lines.filter((i) => parseInt(i) === currline);
  if (!ontheline) {
    return;
  }
  if (ontheline.length > 1) {
    vscode.window
      .showQuickPick(
        ontheline.map((id) => {
          const diag = errorviz.diags.get(id);
          const [line, ecode] = id.split("_", 2);
          const label = `${ecode} on line ${parseInt(line) + 1}`;
          const detail = diag?.diagnostics.message;
          return { label, detail, id };
        })
      )
      .then((selected) => {
        if (selected !== undefined) {
          errorviz.toggleDiag(editor, selected.id);
        }
      });
  } else {
    errorviz.toggleDiag(editor, ontheline[0]);
  }
}

function ammendInlineViz(
  editor: vscode.TextEditor,
  change: vscode.TextDocumentContentChangeEvent) {
    const currline = change.range.start.line;
    const lines = [...errorviz.diags.keys()];
    const ontheline = lines.filter((i) => parseInt(i) === currline);
    if (!ontheline) {
      return;
    }
    console.log(ontheline);
    
}

// function toggleFirstViz(editor: vscode.TextEditor) {
//   const lines = [...errorviz.diags.keys()];
//   if (lines.length === 0) {
//     return;
//   }
//   errorviz.toggleDiag(editor, lines[0]);

// }

function clearAllVisualizations(e: vscode.TextEditor, _: vscode.TextEditorEdit) {
  errorviz.hideAllDiags(e);
}

// This method is called when your extension is deactivated
export function deactivate() {
  if (intervalHandle) {
    clearInterval(intervalHandle);
  }
}