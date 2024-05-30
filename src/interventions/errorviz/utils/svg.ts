import * as vscode from "vscode";
import { createSVGWindow } from "svgdom";
import { SVG, registerWindow, Svg, G as Group } from "@svgdotjs/svg.js";

import { log } from "../../../utils/log";
import { minmax } from "../../../utils/math";
import { CONFIG, ErrorvizColorThemeName } from "../config";
import { regionText, pointerText } from "./canvas";

export function svg2uri(svg: Svg): vscode.Uri {
  const uri = `data:image/svg+xml;base64,${Buffer.from(svg.svg()).toString("base64")}`;
  return vscode.Uri.parse(uri);
}

export function newSvg(width: number, height: number): Svg {
  const win = createSVGWindow();
  const doc = win.document;
  registerWindow(win, doc);
  return (<Svg>SVG(doc.documentElement)).size(width, height);
}

export function svgWithCanvas(xshift: number, height: number): [Svg, Group] {
  const { lineheight, fontsize } = CONFIG;
  const svgimg = newSvg(800 + xshift, lineheight * height);
  const canvas = svgimg.group().attr({
    fill: "transparent",
    transform: `translate(${xshift}, 0)`,
    style: `font-family: monospace; font-size: ${fontsize}px; overflow: visible;`,
  });
  return [svgimg, canvas];
}
/// line numbers are 0-indexed

export function regionPointConflict(
  xshift: number,
  fromline: number,
  toline: number,
  errorline: number,
  tipline: number,
  regiontext: string,
  pointtext: string,
  tip: string,
  theme: ErrorvizColorThemeName
): [Svg, number, Group] {
  const { fontsize, lineheight } = CONFIG;
  const [imgfrom, imgto] = minmax(fromline, toline, errorline, tipline);
  const colortheme = CONFIG.color[theme];
  const [svgimg, canvas] = svgWithCanvas(xshift, imgto - imgfrom + 2);
  // TODO: optimize placing algo
  let errorTextLine = errorline;
  if (errorTextLine === fromline) {
    if (toline - fromline > 0) {
      errorTextLine++;
    } else {
      log.warn("no where to put error text");
    }
  }
  regionText(canvas, imgfrom, fromline, toline, fromline, regiontext, colortheme.info);
  pointerText(canvas, imgfrom, errorline, errorTextLine, 0.5, pointtext, colortheme.error);
  canvas
    .text(tip)
    .fill(colortheme.tip)
    .attr({ x: 20, y: fontsize + lineheight * (tipline - imgfrom) });
  return [svgimg, imgfrom, canvas];
}

