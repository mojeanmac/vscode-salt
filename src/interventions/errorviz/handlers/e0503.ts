import { CONFIG } from "../config";
import { getXshift } from "../utils/line";
import { regionPointConflict } from "../utils/svg";
import { renderInapplicable, type RenderFunction } from "./_utils";

export const image503: RenderFunction = (editor, diag, theme) => {
  const borrowed = /^cannot use `(.+)` because it was mutably borrowed/.exec(diag.message)?.[1];
  if (borrowed === undefined) { return renderInapplicable("cannot parse diagnostics"); }

  
  const fromline = diag.relatedInformation?.find((d) => d.message.endsWith("is borrowed here"))?.location.range.start.line;
  const toline = diag.relatedInformation?.find((d) => d.message.endsWith("borrow later used here"))?.location.range.end.line;
  if (fromline === undefined || toline === undefined) { return renderInapplicable("cannot parse diagnostics"); }
  
  const errorline = diag.range.start.line;
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  const imm = `\`${borrowed}\` borrowed mutably in this region`;
  const mut = `\`${borrowed}\` used here, conflicting with the borrow`;
  const tip = `tip: move the use of \`${borrowed}\` out of the borrow region`;
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
};
