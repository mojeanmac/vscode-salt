import { CONFIG } from "../config";
import { getXshift } from "../utils/line";
import { regionPointConflict } from "../utils/svg";
import { h, type RenderFunction } from "./_utils";

export const image505: RenderFunction = (editor, diag, theme) => {
  const borrowed = /^cannot move out of `(.+)` because it is borrowed/.exec(diag.message)?.[1];
  if (borrowed === undefined) { return h.inapplicable("cannot parse diagnostics"); }

  const fromline = diag.relatedInformation?.find((d) => d.message.endsWith("is borrowed here"))?.location.range.start.line;
  const toline = diag.relatedInformation?.find((d) => d.message.endsWith("borrow later used here"))?.location.range.end.line;
  if (fromline === undefined || toline === undefined) { return h.inapplicable("cannot parse diagnostics"); }
  
  const errorline = diag.range.start.line;
  // TODO: parse movein
  const movein = "";
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  const imm = `\`${borrowed}\` borrowed in this region`;
  const mut = `\`${borrowed}\` moved${movein}`;
  const tip = "tip: the move of a value should happen when it is not borrowed.\nafter the move, the value can no longer be borrowed";
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
  return h.success([s, li]);
};
