import { CONFIG } from "../config";
import { getXshift } from "../utils/line";
import { regionPointConflict } from "../utils/svg";
import { renderInapplicable, type RenderFunction } from "./_utils";

export const image502: RenderFunction = (editor, diag, theme) => {
  const borrowednull = /^cannot borrow `\*?(.+)` as (im)?mutable/.exec(diag.message);
  if (borrowednull === null) { return renderInapplicable("cannot parse diagnostics"); }
  
  const borrowed = borrowednull[1];
  if (borrowed === undefined) { return renderInapplicable("cannot parse related diagnostics"); }

  const fromline = diag.relatedInformation?.find((d) => d.message.endsWith("borrow occurs here"))?.location.range.start.line;
  const toline = diag.relatedInformation?.find((d) => d.message.endsWith("borrow later used here"))?.location.range.end.line;
  if (fromline === undefined || toline === undefined) { return renderInapplicable("cannot parse related diagnostics"); }
  
  // whether the error point is immutable.
  const isimm = borrowednull[2] === "im";
  const mutPrefix = isimm ? "im" : "";
  
  const errorline = diag.range.start.line;
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  const region = `\`${borrowed}\` borrowed ${mutPrefix}mutably in this region`;
  const point =
    `\`${borrowed}\` borrowed ${mutPrefix}mutably here, ` +
    `conflicting with the previous borrow`;
  const tip =
    `tip: move the ${mutPrefix}mutable borrow ` +
    `out of the ${mutPrefix}mutable borrow area`;
  const [s, li, _] = regionPointConflict(
    xshift,
    fromline,
    toline,
    errorline,
    toline,
    region,
    point,
    tip,
    theme
  );
  return [s, li];
};
