import { G as Group } from "@svgdotjs/svg.js";

import { CONFIG } from "../config";

/**
 * Draw a pointer to a line and add text at the right
 * @param lineoffset which line do you want to annotate?
 * @param textoffset which line do you want to put the text?
 * @param pointeroffset where should the pointer be? (0: at the top of the line, 0.5: at the middle, 1: at the bottom)
 */
export function pointerText(
  canvas: Group,
  baseline: number,
  lineoffset: number,
  textoffset: number,
  pointeroffset: number,
  text: string,
  color: string
) {
  const { fontsize, lineheight, arrowsize } = CONFIG;
  canvas
    .path(
      `M0,${(lineoffset - baseline + pointeroffset) * lineheight} l15,0
      l0,${(textoffset - lineoffset - pointeroffset + 0.5) * lineheight} l10,0
      l${-arrowsize},${-arrowsize / 2}
      m${arrowsize},${arrowsize / 2}
      l${-arrowsize},${arrowsize / 2}`
    )
    .stroke(color);
  canvas
    .plain(text)
    .fill(color)
    .attr({ x: 30, y: fontsize + lineheight * (textoffset - baseline) });
}

/**
 * Draw a pointer to a region and add text at the right
 * @param lineoffset which line do you want to put the arrow and the text?
 * @param options fromopen: whether to draw horizontal line at regionfrom
 */
export function regionText(
  canvas: Group,
  baseline: number,
  regionfrom: number,
  regionto: number,
  lineoffset: number,
  text: string,
  color: string,
  options: {
    textarrow?: boolean;
    fromopen?: boolean;
    fromarrow?: boolean;
    toopen?: boolean;
    toarrow?: boolean;
  } = { textarrow: true }
) {
  const { lineheight, fontsize, arrowsize } = CONFIG;
  canvas
    .path(
      `M0,${(regionfrom - baseline) * lineheight} ${options.fromopen ? "m" : "l"}10,0
       l0,${lineheight * (regionto - regionfrom + 1)} ${options.toopen ? "m" : "l"}-10,0`
    )
    .stroke(color);
  if (options.textarrow) {
    canvas
      .path(
        `M10,${(0.5 + lineoffset - baseline) * lineheight}l10,0
         l${-arrowsize},${-arrowsize / 2}
         m${arrowsize},${arrowsize / 2}
         l${-arrowsize},${arrowsize / 2}`
      )
      .stroke(color);
  }
  const arrowleft = `
    l${arrowsize},${-arrowsize / 2}
    m${-arrowsize},${arrowsize / 2}
    l${arrowsize},${arrowsize / 2}`;
  const arrowup = `
    l${-arrowsize / 2},${arrowsize}
    m${arrowsize / 2},${-arrowsize}
    l${arrowsize / 2},${arrowsize}`;
  const arrowdown = `
    l${-arrowsize / 2},${-arrowsize}
    m${arrowsize / 2},${arrowsize}
    l${arrowsize / 2},${-arrowsize}`;
  if (options.fromarrow) {
    if (options.fromopen) {
      canvas.path(`M10,${(regionfrom - baseline) * lineheight} ${arrowup}`).stroke(color);
    } else {
      canvas.path(`M0,${(regionfrom - baseline) * lineheight} ${arrowleft}`).stroke(color);
    }
  }
  if (options.toarrow) {
    if (options.toopen) {
      canvas.path(`M10,${(regionto + 1 - baseline) * lineheight} ${arrowdown}`).stroke(color);
    } else {
      canvas.path(`M0,${(regionto + 1 - baseline) * lineheight} ${arrowleft}`).stroke(color);
    }
  }
  const textx = options.textarrow ? 30 : 20;
  canvas
    .text(text)
    .fill(color)
    .attr({ x: textx, y: fontsize + lineheight * (lineoffset - baseline) });
}

