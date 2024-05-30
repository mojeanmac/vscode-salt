import * as vscode from 'vscode';

import { isHandlerUnsuccessful } from '../utils/handler';
import { inlineSuggestionHandlersMap } from './handlers';

// TODO 2024 05 29 (wd):
// might need to have multiple decoration types for inline hints (e.g. for different colors).
// this would likely mean having to refactor the handler success return type (to distinguish which decorations are of which type).

const inlineHintDecorationType = vscode.window.createTextEditorDecorationType({
  before: {
    contentText: "*",
    color: '#ff0000',
    backgroundColor: '#eddddd',
  },
  // after: {
  //   contentText: " SALT: consider dereferencing here to assign to the mutably borrowed value",
  //   color: "#ff0000",
  //   backgroundColor: '#eddddd',
  // }
});

export function showInlineSuggestions(
  editor: vscode.TextEditor,
  diagnostics: vscode.Diagnostic[],
) {
  let decorations = [];
  for (const diag of diagnostics) {
    if (!(typeof diag.code === "object" && typeof diag.code.value === "string")) { continue; }
    const handler = inlineSuggestionHandlersMap.get(diag.code.value);
    if (handler === undefined) { continue; }
    const result = handler(editor, diag);
    if (isHandlerUnsuccessful(result)) { continue; }
    decorations.push(...result.data);
  }
  editor.setDecorations(inlineHintDecorationType, decorations);
}

