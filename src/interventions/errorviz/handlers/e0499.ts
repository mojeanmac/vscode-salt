import { CONFIG } from "../config";
import { pointerText } from "../utils/canvas";
import { getXshift } from "../utils/line";
import { regionPointConflict, svgWithCanvas } from "../utils/svg";
import { renderInapplicable, type RenderFunction } from "./_utils";

export const image499: RenderFunction = (editor, diag, theme) => {
  const borrowed = /^cannot borrow `(.+)` as mutable more than once at a time/.exec(diag.message)?.[1];
  if (borrowed === undefined) { return renderInapplicable("cannot parse diagnostics"); }
  
  const fromline = diag.relatedInformation?.find((d) => d.message.endsWith("first mutable borrow occurs here"))?.location.range.start.line;
  const toline = diag.relatedInformation?.find((d) => d.message.endsWith("first borrow later used here"))?.location.range.end.line;
  if (fromline === undefined || toline === undefined) { return renderInapplicable("cannot parse diagnostics"); }
  
  const colortheme = CONFIG.color[theme];
  const errorline = diag.range.start.line;
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  if (fromline === toline) {
    // loop situation
    const tipline = errorline + 1;
    const [svgimg, canvas] = svgWithCanvas(xshift, errorline - fromline + 2);
    pointerText(
      canvas,
      fromline,
      fromline,
      fromline,
      0.5,
      `\`${borrowed}\` mutably borrowed for the duration of the loop`,
      colortheme.info
    );
    pointerText(
      canvas,
      fromline,
      errorline,
      errorline,
      0.5,
      `\`${borrowed}\` mutably borrowed again`,
      colortheme.error
    );
    canvas
      .text("tip: a value can only be mutably borrowed once at a time")
      .fill(colortheme.tip)
      .attr({ x: 20, y: CONFIG.fontsize + CONFIG.lineheight * (tipline - fromline) });
    return [svgimg, fromline];
  } else {
    const imm = `\`${borrowed}\` borrowed mutably in this region`;
    const mut = `\`${borrowed}\` borrowed mutably again, conflicting with the first borrow`;
    const tip = "tip: a variable can only be mutably borrowed once at a time";
    const [s, li, _] = regionPointConflict(
      xshift,
      fromline,
      toline,
      errorline,
      toline,
      imm,
      mut,
      tip,
      theme
    );
    return [s, li];
  }
};
