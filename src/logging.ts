//helper functions for logEvent
import * as vscode from "vscode";
import { log } from "./utils/log";
import * as crypto from 'crypto';
import { suggestions, iteratorMethods } from "./patterns";

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

export async function countrs(): Promise<number> {
    //get all Rust files in the workspace
    const files = await vscode.workspace.findFiles('**/*.rs');
    return files.length;
}
  
export function forLoopCount(text: string): number {
    const forLoopRegex = /\bfor\s+\w+\s+in\s+/g;
    const forLoopMatches = text.match(forLoopRegex);
    return forLoopMatches ? forLoopMatches.length : 0;

}

export function iterChains(text: string): string[][] {
  text = text.replace(/\s/g, ''); // remove whitespace
  const methodsPattern = iteratorMethods.map(method => `\\.${method}\\(`).join("|");
  const methodsRegex = new RegExp(`${methodsPattern}`, "g");
  const iterChains: string[][] = [];
  let currentChain: string[] = [];
  let depth = 0; // To track parentheses depth
  let idx = 0;

  while (idx < text.length) {
    methodsRegex.lastIndex = idx;
    const match = methodsRegex.exec(text);

    // no more matches, exit loop
    if (!match) {
      iterChains.push(currentChain);
      break;
    }

    // start a new chain
    const matchStart = match.index;
    console.log(idx);
    console.log("matchStart", matchStart);
    if (matchStart !== idx) {
      iterChains.push(currentChain);
      currentChain = [];
    }
    const method = match[0];
    currentChain.push(method.slice(1, -1));

    // move to the character after the method name and first parenthesis
    idx = matchStart + method.length;
    console.log("new idx", idx);
    depth = 1;
    while (depth !== 0 && idx < text.length) {
        const char = text[idx];
        if (char === "(") {
          depth++;
        } else if (char === ")") {
          depth--;
        }
        idx++;
    }
  }

  return iterChains.slice(1);
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