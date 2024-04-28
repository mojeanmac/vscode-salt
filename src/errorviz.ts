import * as vscode from "vscode";
import { log } from "./utils/log";
import { svg2uri, triangleAvail, triangleShown } from "./utils/vis";
import { imageByCode } from "./visualizations";

function newDecorationType(): vscode.TextEditorDecorationType {
  return vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
  });
}

// color choices:
//  vscode command: generate color theme from current settings
//   error: token.error-token
//   info: token.info-token
//   info2: token.debug-token
//   tip: entity.name.label
export const CONFIG = {
  fontsize: vscode.workspace.getConfiguration("editor").get<number>("fontSize") ?? 14,
  charwidth: 9,
  lineheight: 0,
  arrowsize: 6,
  color: {
    light: {
      error: "#CD3131",
      info: "#316BCD",
      info2: "#800080",
      tip: "#000000",
    },
    dark: {
      error: "#F44747",
      info: "#6796E6",
      info2: "#B267E6",
      tip: "#C8C8C8",
    },
  },
};
CONFIG.lineheight = Math.max(8, Math.round(1.35 * CONFIG.fontsize));

export type DiagnosticInfo = {
  diagnostics: vscode.Diagnostic;
  displayed: boolean;
  dectype: vscode.TextEditorDecorationType | null;
  svg: vscode.DecorationOptions | null;
};
export const G = {
  triangleAvailDtype: vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    gutterIconPath: svg2uri(triangleAvail()),
  }),
  triangleShownDtype: vscode.window.createTextEditorDecorationType({
    isWholeLine: true,
    gutterIconPath: svg2uri(triangleShown()),
  }),
  diags: new Map<string, DiagnosticInfo>(),
  showTriangles(editor: vscode.TextEditor, diags: Map<string, DiagnosticInfo> | null = null) {
    if (diags === null) {
      diags = this.diags;
    }
    const showns: vscode.Range[] = [];
    const avails: vscode.Range[] = [];
    for (const [k, v] of diags) {
      const line = parseInt(k);
      const range = new vscode.Range(line, 0, line, 0);
      if (v.displayed) {
        showns.push(range);
      } else {
        avails.push(range);
      }
    }
    editor.setDecorations(this.triangleShownDtype, showns);
    editor.setDecorations(this.triangleAvailDtype, avails);
  },
  hideTriangles(editor: vscode.TextEditor) {
    editor.setDecorations(this.triangleShownDtype, []);
    editor.setDecorations(this.triangleAvailDtype, []);
  },
  hideAllDiags(editor: vscode.TextEditor, diags: Map<string, DiagnosticInfo> | null = null) {
    if (diags === null) {
      diags = this.diags;
    }
    for (const d of diags.keys()) {
      this.hideDiag(editor, d, diags);
    }
    this.showTriangles(editor, diags);
  },
  toggleDiag(
    editor: vscode.TextEditor,
    idx: string,
    diags: Map<string, DiagnosticInfo> | null = null
  ) {
    if (diags === null) {
      diags = this.diags;
    }
    const totoggle = diags.get(idx);
    if (totoggle === undefined) {
      log.info("nothing to toggle");
      return;
    }
    if (totoggle.displayed) {
      this.hideDiag(editor, idx);
    } else {
      this.showDiag(editor, idx);
    }
    this.showTriangles(editor);
  },
  hideDiag(
    editor: vscode.TextEditor,
    idx: string,
    diags: Map<string, DiagnosticInfo> | null = null
  ) {
    if (diags === null) {
      diags = this.diags;
    }
    const diaginfo = diags.get(idx);
    if (diaginfo === undefined) {
      return;
    }
    if (diaginfo.dectype !== null) {
      editor.setDecorations(diaginfo.dectype, []);
    }
    diaginfo.displayed = false;
  },
  showDiag(
    editor: vscode.TextEditor,
    erridx: string,
    diags: Map<string, DiagnosticInfo> | null = null
  ) {
    if (diags === null) {
      diags = this.diags;
    }
    // TODO: workaround to avoid overlapping visualizations
    this.hideAllDiags(editor, diags);
    const diaginfo = diags.get(erridx);
    if (diaginfo === undefined) {
      const msg = `diags for ${erridx} does not exist`;
      log.error(msg);
      vscode.window.showErrorMessage(msg);
      return;
    }
    const diag = diaginfo.diagnostics;
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
  },
};
