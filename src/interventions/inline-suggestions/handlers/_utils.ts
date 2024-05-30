import type { DecorationOptions, Diagnostic, TextEditor } from "vscode";

import { h as handler, type H, type HandlerResult } from '../../utils/handler';

export type InlineSuggestionHandler = (editor: TextEditor, diag: Diagnostic) => HandlerResult<InlineSuggestionSuccess>;

export type InlineSuggestionSuccess = DecorationOptions[];

export const h: H<InlineSuggestionSuccess> = handler;