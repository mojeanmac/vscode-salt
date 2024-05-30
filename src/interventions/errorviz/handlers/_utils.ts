import type { Diagnostic, TextEditor } from "vscode";
import type { Svg } from "@svgdotjs/svg.js";
import type { ErrorvizColorThemeName } from "../config";

/**
 * a render function produces either:
 * - a tuple of an svg and the line to render it on, or,
 * - an explanation of why the render function does not apply
 */
export type RenderFunction = (editor: TextEditor, diag: Diagnostic, theme: ErrorvizColorThemeName) => RenderResult;

export type RenderResult =
  | RenderSuccess
  | RenderUnsuccessful;

export type RenderUnsuccessful =
    | RenderInapplicable
    | RenderFailure;

export type RenderSuccess = [svg: Svg, line: number];
export type RenderInapplicable = { type: 'inapplicable', context?: string };
export type RenderFailure = { type: 'render_error', context: string };


export function isRenderUnsuccessful(result: RenderResult): result is RenderUnsuccessful {
  return typeof result === 'object';
}

export function renderInapplicable(context?: string): RenderInapplicable {
  return { type: 'inapplicable', context };
}

export function renderFailure(context: string): RenderFailure {
  return { type: 'render_error', context };
}
