import * as vscode from 'vscode';

import { log } from '../../../utils/log';

import { dereferenceToAssignToMutBorrow } from './e0308';

const nullPrototype = <O extends {}>(o: O) => Object.assign(o, null) as O;

const COMMANDS = nullPrototype({
  /* eslint-disable @typescript-eslint/naming-convention */
  "e0308.dereferenceToAssignToMutBorrow": dereferenceToAssignToMutBorrow,
  /* eslint-enable @typescript-eslint/naming-convention */
} as const satisfies Record<string, (...args: never) => any>);

type CommandId = `salt.inlay-suggestions.${keyof typeof COMMANDS}`;
/**
 * https://code.visualstudio.com/api/extension-guides/command#command-uris
 */
export function createCommandUri<T extends keyof typeof COMMANDS>(id: T, args: Parameters<(typeof COMMANDS)[T]>) {
  const commandId: CommandId = `salt.inlay-suggestions.${id}`;
  const encodedArgs = encodeURIComponent(JSON.stringify(args));
  const commandUri = vscode.Uri.parse(`command:${commandId}?${encodedArgs}`);
  return commandUri;
}

export function registerCommands(ctx: vscode.ExtensionContext) {
  const disposables = Object.entries(COMMANDS).map(([id, handler]) => vscode.commands.registerCommand(`salt.inlay-suggestions.${id}`, handler));
  log.info(disposables.length, { disposables });
  ctx.subscriptions.push(...disposables);
}
