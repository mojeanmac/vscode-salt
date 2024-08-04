import * as vscode from "vscode";

import { log } from "../../utils/log";
import { imageByCode } from "./utils/image";
import { svg2uri } from "./utils/svg";
import { triangleAvail, triangleShown } from "./triangle";
import { inlineSuggestionHandlersMap } from "../inline-suggestions/handlers";

function newDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({ isWholeLine: true });
}

export type DiagnosticInfo = {
  diagnostics: vscode.Diagnostic;
  displayed: boolean;
  dectype: vscode.TextEditorDecorationType | null;
  svg: vscode.DecorationOptions | null;
};

const triangleAvailDtype = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  gutterIconPath: svg2uri(triangleAvail()),
});
const triangleShownDtype = vscode.window.createTextEditorDecorationType({
  isWholeLine: true,
  gutterIconPath: svg2uri(triangleShown()),
});

export const diags = new Map<string, DiagnosticInfo>();

const isInline = (diag: vscode.Diagnostic): boolean => {
  return diag.code !== undefined
    && typeof diag.code !== "number"
    && typeof diag.code !== "string"
    && typeof diag.code.value === "string"
    && inlineSuggestionHandlersMap.has(diag.code.value);
};

export function showTriangles(editor: vscode.TextEditor, _diags?: Map<string, DiagnosticInfo>) {
  const resolvedDiags = _diags ?? diags;
  const showns: vscode.Range[] = [];
  const avails: vscode.Range[] = [];
  for (const [k, v] of resolvedDiags) {
    const line = parseInt(k);
    const range = new vscode.Range(line, 0, line, 0);
    if (v.displayed || isInline(v.diagnostics)) {
      showns.push(range);
    } else {
      avails.push(range);
    }
  }
  editor.setDecorations(triangleShownDtype, showns);
  editor.setDecorations(triangleAvailDtype, avails);
}

export function hideTriangles(editor: vscode.TextEditor) {
  editor.setDecorations(triangleShownDtype, []);
  editor.setDecorations(triangleAvailDtype, []);
}

export function hideAllDiags(editor: vscode.TextEditor, _diags?: Map<string, DiagnosticInfo>) {
  const resolvedDiags = _diags ?? diags;
  for (const d of resolvedDiags.keys()) {
    hideDiag(editor, d, resolvedDiags);
  }
  showTriangles(editor, resolvedDiags);
}

export function toggleDiag(
  editor: vscode.TextEditor,
  idx: string,
  _diags?: Map<string, DiagnosticInfo>,
) {
  const resolvedDiags = _diags ?? diags;
  const totoggle = resolvedDiags.get(idx);
  if (totoggle === undefined) {
    log.info("nothing to toggle");
    return;
  }
  if (totoggle.displayed) {
    hideDiag(editor, idx);
  } else {
    showDiag(editor, idx);
  }
  showTriangles(editor);
}

export function hideDiag(
  editor: vscode.TextEditor,
  idx: string,
  _diags?: Map<string, DiagnosticInfo>,
) {
  const resolvedDiags = _diags ?? diags;
  const diaginfo = resolvedDiags.get(idx);
  if (diaginfo === undefined) {
    return;
  }
  if (diaginfo.dectype !== null) {
    editor.setDecorations(diaginfo.dectype, []);
  }
  diaginfo.displayed = false;
}

export function showDiag(
  editor: vscode.TextEditor,
  erridx: string,
  _diags?: Map<string, DiagnosticInfo>,
) {
  const resolvedDiags = _diags ?? diags;
  const diaginfo = resolvedDiags.get(erridx);
  if (diaginfo === undefined) {
    const msg = `diags for ${erridx} does not exist`;
    log.error(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }
  const diag = diaginfo.diagnostics;
  if (isInline(diag)) { return; };
  // TODO: workaround to avoid overlapping visualizations
  hideAllDiags(editor, resolvedDiags);
  const img = imageByCode(editor, diag);
  if (typeof img === "string") {
    const msg = "SVG generation failed: " + img;
    log.error(msg);
    vscode.window.showErrorMessage(msg);
    return;
  }
  diaginfo.svg = img;
  if (diaginfo.dectype === null) {
    diaginfo.dectype = newDecorationType();
  }
  diaginfo.displayed = true;
  editor.setDecorations(diaginfo.dectype, [diaginfo.svg]);
}
