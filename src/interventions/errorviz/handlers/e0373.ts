import { CONFIG } from "../config";
import { getXshift } from "../utils/line";
import { svgWithCanvas } from "../utils/svg";

import type { RenderFunction } from "./_utils";

export const image373: RenderFunction = (editor, diag, theme) => {
  const colortheme = CONFIG.color[theme];
  const { fontsize, lineheight, charwidth, arrowsize } = CONFIG;
  const borrowed = /^closure may outlive the current function, but it borrows `(.+)`,/.exec(diag.message)?.[1];
  const line = diag.range.start.line;
  const xshift = getXshift(editor, line, line + 2) * charwidth;
  const [svgimg, canvas] = svgWithCanvas(xshift, 2);
  canvas
    .path(
      `M0,${lineheight / 2} l10,0 l0,${lineheight * 1.5}
       l${-arrowsize / 2},${-arrowsize}
       m${arrowsize / 2},${arrowsize}
       l${arrowsize / 2},${-arrowsize}`
    )
    .stroke(colortheme.error);
  canvas
    .text(`the closure borrows \`${borrowed}\`, which only lives in the current function`)
    .fill(colortheme.info)
    .attr({ x: 20, y: fontsize });
  canvas
    .text(`but the closure needs to live after the function returns`)
    .fill(colortheme.error)
    .attr({ x: 20, y: fontsize + lineheight });
  return [svgimg, line];
};
