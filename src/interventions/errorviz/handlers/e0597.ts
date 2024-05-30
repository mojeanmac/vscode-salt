import { log } from "../../../utils/log";
import { minmax } from "../../../utils/math";
import { CONFIG } from "../config";
import { pointerText, regionText } from "../utils/canvas";
import { getXshift } from "../utils/line";
import { regionPointConflict, svgWithCanvas } from "../utils/svg";
import { renderInapplicable, type RenderFunction } from "./_utils";

export const image597: RenderFunction = (editor, diag, theme) => {
  const borrowed = /`(.+)` does not live long enough/.exec(diag.message)?.[1];
  if (borrowed === undefined) { return renderInapplicable("cannot parse diagnostics"); }

  const validfrom = diag.range.start.line;
  const validto = diag.relatedInformation?.find((d) => d.message.endsWith("dropped here while still borrowed"))?.location.range.end.line;
  if (validfrom === undefined || validto === undefined) { return renderInapplicable("cannot parse diagnostics"); }
  
  const colortheme = CONFIG.color[theme];
  
  const lateruseObj = diag.relatedInformation?.find((d) => d.message.endsWith("borrow later used here") || d.message.endsWith("borrow later stored here"));
  const laterMightUse = diag.relatedInformation?.find((d) => d.message.startsWith("borrow might be used here,"));
  const shouldStatic = diag.relatedInformation?.find((d) => d.message.endsWith(" is borrowed for `'static`"))?.location.range.end.line;

  if (lateruseObj !== undefined) {
    if (lateruseObj.location.range.end.line !== lateruseObj.location.range.start.line) {
      log.warn("user crossed multiple lines");
    }
    const lateruse = lateruseObj.location.range.end.line;
    // get the name of the borrower
    const line = editor.document.lineAt(lateruse).text;
    const userfrom = lateruseObj.location.range.start.character;
    const userto = lateruseObj.location.range.end.character;
    const user = line.slice(userfrom, userto);
    const [lf, lt] = minmax(validfrom, validto, lateruse);
    const xshift = getXshift(editor, lf, lt + 1) * CONFIG.charwidth;
    const [s, li, _] = regionPointConflict(
      xshift,
      validfrom,
      validto,
      lateruse,
      lt + 1,
      `\`${user}\` borrows from \`${borrowed}\` and can only be used in this region`,
      `\`${borrowed}\` is no longer valid, while \`${user}\` is still borrowing it`,
      `tip: make sure \`${user}\` borrows from a valid value`,
      theme
    );
    return [s, li];
  } else if (laterMightUse !== undefined) {
    const mightuse = laterMightUse.location.range.start.line;
    const xshift = getXshift(editor, validfrom, mightuse) * CONFIG.charwidth;
    const [imgfrom, imgto] = minmax(validfrom, validto, mightuse, mightuse + 1);
    const [svgimg, canvas] = svgWithCanvas(xshift, imgto - imgfrom + 2);
    regionText(
      canvas,
      validfrom,
      validfrom,
      validto,
      validto,
      `\`${borrowed}\` can only be used until this point`,
      colortheme.info,
      { textarrow: false, fromopen: true, toarrow: true }
    );
    pointerText(
      canvas,
      validfrom,
      mightuse,
      mightuse,
      0.5,
      laterMightUse.message,
      colortheme.error
    );
    return [svgimg, imgfrom];
  } else if (shouldStatic !== undefined) {
    // should be static
    const [line, lineto] = minmax(shouldStatic, validfrom, validto);
    const xshift = getXshift(editor, validfrom, validto) * CONFIG.charwidth;
    const [svgimg, canvas] = svgWithCanvas(xshift, lineto - line + 2);
    pointerText(
      canvas,
      line,
      validto,
      validto,
      0.5,
      `lifetime of \`${borrowed}\` ends here`,
      colortheme.info
    );
    pointerText(
      canvas,
      line,
      shouldStatic,
      shouldStatic,
      0.5,
      `\`${borrowed}\` is required to have static lifetime`,
      colortheme.error
    );
    return [svgimg, line];
  } else {
    // no user and no 'static
    return renderInapplicable("cannot parse diagnostics");
  }
};
