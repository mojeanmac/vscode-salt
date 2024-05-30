import type { Diagnostic, TextEditor } from "vscode";
import type { Svg } from "@svgdotjs/svg.js";

import { h as handler, type H, type HandlerResult } from '../../utils/handler';

import type { ErrorvizColorThemeName } from "../config";

export type RenderFunction = (editor: TextEditor, diag: Diagnostic, theme: ErrorvizColorThemeName) => HandlerResult<RenderSuccess>;

export type RenderSuccess = [svg: Svg, line: number];

export const h: H<RenderSuccess> = handler;