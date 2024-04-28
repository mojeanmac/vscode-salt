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

