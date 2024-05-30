import { CONFIG } from "../config";
import { pointerText } from "../utils/canvas";
import { getXshift } from "../utils/line";
import { regionPointConflict, svgWithCanvas } from "../utils/svg";
import { renderInapplicable, type RenderFunction } from "./_utils";

export const image382: RenderFunction = (editor, diag, theme) => {
  const moveline = diag.relatedInformation?.find((d) => d.message.endsWith("value moved here"))?.location.range.start.line;
  if (moveline === undefined) { return renderInapplicable("cannot parse diagnostics"); }
  
  const { charwidth } = CONFIG;
  const colortheme = CONFIG.color[theme];
  const errorline = diag.range.start.line;
  const moved = (/: `(.+)`\n/.exec(diag.message) ?? [])[1];
  const defineline = diag.relatedInformation?.find((d) => d.message.startsWith("move occurs because `"))?.location.range.start.line;
  
  if (defineline === undefined) {
    // no diagnostics information on defined location
    const line = moveline;
    const xshift = getXshift(editor, line, errorline + 2) * charwidth;
    const [svgimg, canvas] = svgWithCanvas(xshift, errorline - line + 2);
    pointerText(
      canvas,
      moveline,
      moveline,
      moveline,
      0.5,
      `end of \`${moved}\`'s lifetime when it is moved`,
      colortheme.info
    );
    pointerText(
      canvas,
      moveline,
      errorline,
      errorline,
      0.5,
      `use of \`${moved}\` after being moved`,
      colortheme.error
    );
    canvas
      .text("tip: value cannot be used after being moved")
      .fill(colortheme.tip)
      .attr({ x: 20, y: CONFIG.fontsize + CONFIG.lineheight * (errorline - moveline + 1) });
    return [svgimg, line];
  }
  const xshift = getXshift(editor, defineline, errorline) * CONFIG.charwidth;
  const [svgimg, line, canvas] = regionPointConflict(
    xshift,
    defineline,
    moveline,
    errorline,
    errorline + 1,
    `lifetime of \`${moved}\``,
    `use of \`${moved}\` after being moved`,
    "tip: value cannot be used after being moved",
    theme
  );
  pointerText(
    canvas,
    defineline,
    moveline,
    moveline,
    1,
    `\`${moved}\` moved to another variable`,
    colortheme.info2
  );
  return [svgimg, line];
};
