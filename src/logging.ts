//helper functions for logEvent
import * as vscode from "vscode";
import { log } from "./utils/log";
import * as crypto from 'crypto';
import { suggestions } from "./utils/patterns";
import * as fs from "fs";
import * as path from "path";

export { openNewLog, openExistingLog, logError, copilotStatus, countrs, hashString };

interface ErrorJson {
    code: string | number,
      msg: string,
      source: string | undefined,
      hint: string,
      range:{
        start: number,
        end: number
      }
  }

/**
 * Opens an existing log file
 * @param logDir - directory to store logs
 * @param enableExt - whether the extension is enabled
 * @param timeSinceStart - the time since the study began
 * @returns path of current log, line count, and the stream
 */
function openExistingLog(logDir: string, timeSinceStart: number): [string, number, number, fs.WriteStream]{
  //find how many json files are in folder to determine current log #
  let logCount = fs.readdirSync(logDir)
      .filter(f => path.extname(f) === ".json").length;
  const logPath = path.join(logDir, `log${logCount}.json`);

  //timesincestart = (initialStamp - startDate)
  fs.writeFileSync(logPath, JSON.stringify({extensionReload: {timeSinceStart}}) + '\n', {flag: 'a'});
  let linecnt = fs.readFileSync(logPath, 'utf-8').split('\n').length;
  //create new stream
  const stream = fs.createWriteStream(logPath, {flags: 'a'});

  return [logPath, logCount, linecnt, stream];
}

/**
* Creates a new log file
* @param logDir - directory to store logs
* @param enableExt - whether the extension is enabled
* @param uuid - the unique identifier for the user
* @returns path of current log, line count, and the stream
*/
function openNewLog(logDir: string, uuid: string): [string, number, number, fs.WriteStream]{
  let logCount = fs.readdirSync(logDir)
      .filter(f => path.extname(f) === ".json").length;

  logCount++; //we are creating a new file, so increment the count
  const logPath = path.join(logDir, `log${logCount}.json`);

  fs.writeFileSync(logPath, JSON.stringify({logCount, uuid}) + '\n', {flag: 'a'});
  let linecnt = 0;

  const stream = fs.createWriteStream(logPath, {flags: 'a'});
  return [logPath, logCount, linecnt, stream];
}

function logError(diagnostics: vscode.Diagnostic[]): ErrorJson[] {
    //for every error create a JSON object in the errors list
  let errors: ErrorJson[] = [];
  for (const diag of diagnostics) {
    if (diag.code === undefined || typeof diag.code === "number" || typeof diag.code === "string") {
      log.error("unexpected diag.code type", typeof diag.code);
      return [];
    }
    let code = diag.code.value;

    //syntax errors dont follow Rust error code conventions
    if (typeof code === "string" && code[0] !== 'E'){
      code = "Syntax";
    }

    //do any of the hints match our ref/deref patterns?
    let hint = "";
    if (diag.relatedInformation !== undefined){
      diag.relatedInformation.forEach((info) => {
        suggestions.forEach((suggestion) => {
          if (suggestion.test(info.message)){
            hint = info.message;
          }
        });
      });
    }

    //add error data to list
    errors.push({
      code: code,
      msg: hashString(diag.message),
      source: diag.source,
      hint: hint,
      range:{
        start: diag.range.start.line,
        end: diag.range.end.line
      }
    });
  }
  return errors;
}

function copilotStatus(): string {
  const copilotExtension = vscode.extensions.getExtension('github.copilot');
  if (copilotExtension) {
    if (copilotExtension.isActive) {
      const config = vscode.workspace.getConfiguration('github.copilot');
      if (config.get('enable.rust')) {
          return "enabled";
      } else {
        return "disabled";
      }
    } else {
        return "inactive";
    }
  } else {
      return "not installed";
  }
}

async function countrs(): Promise<number> {
    //get all Rust files in the workspace
    const files = await vscode.workspace.findFiles('**/*.rs');
    return files.length;
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