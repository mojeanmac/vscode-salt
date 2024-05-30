import * as vscode from 'vscode';

import { checkAutoderef } from '../../check/e0308/autoderef';
import { createCommandUri } from '../commands';
import { h, type InlineSuggestionHandler } from './_utils';

/**
 * TODO 2024 05 29 (wd):
 * currently hardcode supports only single `*` dereference.
 * should generalize it to also support e.g. multiple dereferences.
 */
export const autoderef: InlineSuggestionHandler = (editor, diag) => {
  const checkResult = checkAutoderef(diag);
  if (!checkResult) { return h.inapplicable(); }

  const result: vscode.DecorationOptions[] = [];
  if (typeof diag.code === 'object') {
    for (const info of diag.relatedInformation ?? []) {
      const match = /^consider dereferencing here to assign to the mutably borrowed value: `*`/.test(info.message);
      if (!match) { continue; }
      const range = info.location.range;

      // range is 0-width long, i.e. it becomes incredibly difficult to hover over.
      // better to get the whole word and let the hover message apper over any of it.
      const decorationRange = editor.document.getWordRangeAtPosition(range.start) ?? range;

      // // another idea of a possible range
      // const rangeToEndOfLine = range.with(undefined, range.start.with(undefined, editor.document.lineAt(range.start).text.length))

      const commandUri = createCommandUri('e0308.dereferenceToAssignToMutBorrow', [range.start.line, range.start.character]);
      const hoverMessage = new vscode.MarkdownString(`[SALT: consider dereferencing here to assign to the mutably borrowed value (click to accept)](${commandUri})`);
      hoverMessage.isTrusted = true;
      const decoration: vscode.DecorationOptions = {
        range: decorationRange,
        hoverMessage,
      };
      result.push(decoration);
      break;
    }
  }
  return h.success(result);
};