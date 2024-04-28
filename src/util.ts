import { inspect } from "util";
import * as vscode from "vscode";
//@ts-ignore
import { createSVGWindow } from "svgdom";
import { SVG, registerWindow, Svg } from "@svgdotjs/svg.js";

export function svg2uri(svg: Svg): vscode.Uri {
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg.svg()).toString("base64")}`;
  return vscode.Uri.parse(uri);
}

export function newSvg(width: number, height: number): Svg {
  const window = createSVGWindow();
  const document = window.document;
  registerWindow(window, document);
  return (<Svg>SVG(document.documentElement)).size(width, height);
}

const TRIANGLE_SIDE_LEN = 9;
/**
 * Triangle for Shown visualization. Pointing down.
 */
export function triangleShown(): Svg {
  const SL = TRIANGLE_SIDE_LEN;
  const sign = newSvg(SL, SL);
  sign.path(`M0,0 L${SL},0 L${SL / 2},${SL}`).fill("#ff3300");
  return sign;
}

/**
 * Triangle for hidden visualization. Pointing right.
 */
export function triangleAvail(): Svg {
  const SL = TRIANGLE_SIDE_LEN;
  const sign = newSvg(SL, SL);
  sign.path(`M0,0 L${SL},${SL / 2} L0,${SL}`).fill("#ff3300");
  return sign;
}

export const log = new (class {
  private enabled = true;
  private readonly output = vscode.window.createOutputChannel("RError");

  setEnabled(yes: boolean): void {
    log.enabled = yes;
  }

  // Hint: the type [T, ...T[]] means a non-empty array
  debug(...msg: [unknown, ...unknown[]]): void {
    if (!log.enabled) {
      return;
    }
    log.write("DEBUG", ...msg);
  }

  info(...msg: [unknown, ...unknown[]]): void {
    log.write("INFO", ...msg);
  }

  warn(...msg: [unknown, ...unknown[]]): void {
    debugger;
    log.write("WARN", ...msg);
  }

  error(...msg: [unknown, ...unknown[]]): void {
    debugger;
    log.write("ERROR", ...msg);
    log.output.show(true);
  }

  private write(label: string, ...messageParts: unknown[]): void {
    const message = messageParts.map(log.stringify).join(" ");
    const dateTime = new Date().toLocaleString();
    log.output.appendLine(`${label} [${dateTime}]: ${message}`);
  }

  private stringify(val: unknown): string {
    if (typeof val === "string") {
      return val;
    }
    return inspect(val, {
      colors: false,
      depth: 6, // heuristic
    });
  }
})();
