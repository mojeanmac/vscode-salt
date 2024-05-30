import { CONFIG } from "../config";
import { getXshift } from "../utils/line";
import { regionPointConflict } from "../utils/svg";
import { renderInapplicable, type RenderFunction } from "./_utils";

export const image506: RenderFunction = (editor, diag, theme) => {
  const borrowed = /^cannot assign to `(.+)` because it is borrowed/.exec(diag.message)?.[1];
  if (borrowed === undefined) { return renderInapplicable("cannot parse diagnostics"); }

  const fromline = diag.relatedInformation?.find((d) => d.message.endsWith("is borrowed here"))?.location.range.start.line;
  const toline = diag.relatedInformation?.find((d) => d.message.endsWith("borrow later used here"))?.location.range.end.line;
  if (fromline === undefined || toline === undefined) { return renderInapplicable("cannot parse diagnostics"); }
  
  const errorline = diag.range.start.line;
  // TODO: parse movein
  const movein = "something";
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  const mut = `\`${borrowed}\` moved into ${movein}`;
  const tip = "tip: when a variable is borrowed by another variable, it cannot be reassigned";
  const [s, li, _] = regionPointConflict(
    xshift,
    fromline,
    toline,
    errorline,
    toline,
    `\`${borrowed}\` borrowed in this region`,
    `\`${borrowed}\` assigned to another value`,
    tip,
    theme
  );
  return [s, li];
};
