import * as vscode from 'vscode';

/**
 * a diag checker returns `false` if a diagnostic is not applicable,
 *  or computation result of type `T`:
 * this is to reduce duplication of work in case some intermediate computation used in the check
 *  may be relevant for a handler.
 */
export type CheckDiag<T> = (diag: vscode.Diagnostic) => T | false;