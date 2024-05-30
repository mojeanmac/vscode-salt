import * as vscode from "vscode";
import { type Svg } from "@svgdotjs/svg.js";

import { log } from "../../../utils/log";
import { isHandlerUnsuccessful } from "../../utils/handler";
import { errorvizHandlersMap } from "../handlers";
import { svg2uri } from "./svg";

export function imageByCode(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic
): vscode.DecorationOptions | string {
  if (typeof diag.code === "number" ||
    typeof diag.code === "string" ||
    typeof diag.code?.value !== "string") {
    log.error("unexpected diag.code type", diag.code);
    return "unexpected diag.code type";
  }

  const render = errorvizHandlersMap.get(diag.code.value);
  if (render === undefined) {
    log.error(`unsupported error code ${diag.code.value}`);
    return `unsupported error code ${diag.code.value}`;
  } else {
    const darkresult = render(editor, diag, "dark");
    if (isHandlerUnsuccessful(darkresult)) { return darkresult.context ?? 'renderer not applicable'; }
    const lightresult = render(editor, diag, "light");
    if (isHandlerUnsuccessful(lightresult)) { return lightresult.context ?? 'renderer not applicable'; }
    const [dark, line] = darkresult.data;
    const [light, _] = lightresult.data;
    return image2decoration(dark, light, line);
  }
}
function image2decoration(darkImage: Svg, lightImage: Svg, line: number): vscode.DecorationOptions {
  return {
    range: new vscode.Range(line, 0, line, 0),
    renderOptions: {
      light: {
        after: {
          contentIconPath: svg2uri(lightImage),
          verticalAlign: "text-top",
        },
      },
      dark: {
        after: {
          contentIconPath: svg2uri(darkImage),
          verticalAlign: "text-top",
        },
      },
    },
    hoverMessage: new vscode.MarkdownString("click for visualization"),
  };
}
