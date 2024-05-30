import * as vscode from "vscode";

export async function dereferenceToAssignToMutBorrow(line: number, character: number) {
  const editor = vscode.window.activeTextEditor;
  if (!editor) { return; }
  const editResult = await editor.edit(builder => {
    const pos = new vscode.Position(line, character);
    builder.insert(pos, '*');
  });
  if (editResult) {
    // saving ensures diagnostics get updated, avoiding outdated inlay suggestion,
    // but on the other hand that means we're force saving...
    editor.document.save();
  }
};