//helper functions for logEvent
import * as vscode from "vscode";
import { log } from "./utils/log";
import * as crypto from 'crypto';
import { suggestions } from "./patterns";

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

export function logError(diagnostics: vscode.Diagnostic[]): ErrorJson[] {
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

export function copilotStatus(): string {
  const copilotExtension = vscode.extensions.getExtension('github.copilot');
    if (copilotExtension) {
        if (copilotExtension.isActive) {
            return "active";
        } else {
            return "inactive";
        }
    } else {
        return "not installed";
    }
}

export async function countrs(): Promise<number> {
    //get all Rust files in the workspace
    const files = await vscode.workspace.findFiles('**/*.rs');
    return files.length;
}

/**
 * Hashes + truncates strings to 8 characters
 * @param input string to be hashed
 * @returns hashed string
 */
export function hashString(input: string): string {
    const hash = crypto.createHash('sha256');
    hash.update(input);
    return hash.digest('hex').slice(0,8);
}