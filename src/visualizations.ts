import * as vscode from "vscode";
import { Svg, G as Group } from "@svgdotjs/svg.js";
import { log } from "./utils/log";
import { svg2uri, newSvg } from "./util";
import { range, minmax } from "./utils/math";
import { CONFIG } from "./errorviz";

/**
 *  Gets the difference of line width of the longest line from lines `de` to
 * `au` and the width of `de` in character count
 */
function getXshift(editor: vscode.TextEditor, de: number, au: number): number {
  const longest = Math.max(
    ...range(de, au + 1).map((li) => {
      try {
        return editor.document.lineAt(li).text.length;
      } catch (_) {
        return 0;
      }
    })
  );
  const first = editor.document.lineAt(de).text.length;
  return longest - first;
}

function image2decoration(darkImage: Svg, lightImage: Svg, line: number): vscode.DecorationOptions {
  return {
    range: new vscode.Range(line, 0, line, 0),
    renderOptions: {
      light: {
        after: <any>{
          contentIconPath: svg2uri(lightImage),
          verticalAlign: "text-top",
        },
      },
      dark: {
        after: <any>{
          contentIconPath: svg2uri(darkImage),
          verticalAlign: "text-top",
        },
      },
    },
    hoverMessage: new vscode.MarkdownString("click for visualization"),
  };
}

function svgWithCanvas(xshift: number, height: number): [Svg, Group] {
  const { lineheight, fontsize } = CONFIG;
  const svgimg = newSvg(800 + xshift, lineheight * height);
  const canvas = svgimg.group().attr({
    fill: "transparent",
    transform: `translate(${xshift}, 0)`,
    style: `font-family: monospace; font-size: ${fontsize}px; overflow: visible;`,
  });
  return [svgimg, canvas];
}

/**
 * Draw a pointer to a line and add text at the right
 * @param lineoffset which line do you want to annotate?
 * @param textoffset which line do you want to put the text?
 * @param pointeroffset where should the pointer be? (0: at the top of the line, 0.5: at the middle, 1: at the bottom)
 */
function pointerText(
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
function regionText(
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

export const codeFuncMap: Map<
  string,
  (
    editor: vscode.TextEditor,
    diag: vscode.Diagnostic,
    theme: keyof typeof CONFIG.color
  ) => string | [Svg, number]
> = new Map([
  ["E0373", image373],
  ["E0382", image382],
  ["E0499", image499],
  ["E0502", image502],
  ["E0503", image503],
  ["E0505", image505],
  ["E0506", image506],
  ["E0597", image597],
]);

export function imageByCode(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic
): vscode.DecorationOptions | string {
  if (
    typeof diag.code === "number" ||
    typeof diag.code === "string" ||
    typeof diag.code?.value !== "string"
  ) {
    log.error("unexpected diag.code type", diag.code);
    return "unexpected diag.code type";
  }

  const func = codeFuncMap.get(diag.code.value);
  if (func === undefined) {
    log.error(`unsupported error code ${diag.code.value}`);
    return `unsupported error code ${diag.code.value}`;
  } else {
    const darkresult = func(editor, diag, "dark");
    if (typeof darkresult === "string") {
      return darkresult;
    }
    const lightresult = func(editor, diag, "light");
    if (typeof lightresult === "string") {
      return lightresult;
    }
    const [dark, line] = darkresult;
    const [light, _] = lightresult;
    return image2decoration(dark, light, line);
  }
}

/// line numbers are 0-indexed
function regionPointConflict(
  xshift: number,
  fromline: number,
  toline: number,
  errorline: number,
  tipline: number,
  regiontext: string,
  pointtext: string,
  tip: string,
  theme: keyof typeof CONFIG.color
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

function image373(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const colortheme = CONFIG.color[theme];
  const { fontsize, lineheight, charwidth, arrowsize } = CONFIG;
  const borrowed = (/^closure may outlive the current function, but it borrows `(.+)`,/.exec(
    diag.message
  ) ?? [])[1];
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
}

function image382(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const { charwidth, lineheight, fontsize } = CONFIG;
  const colortheme = CONFIG.color[theme];
  const moved = (/: `(.+)`\n/.exec(diag.message) ?? [])[1];
  const errorline = diag.range.start.line;
  const defineline = diag.relatedInformation?.filter((d) =>
    d.message.startsWith("move occurs because `")
  )[0]?.location.range.start.line;
  const moveline = diag.relatedInformation?.filter((d) => d.message.endsWith("value moved here"))[0]
    ?.location.range.start.line;
  if (moveline === undefined) {
    return "cannot parse diagnostics";
  }
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
}

function image499(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const colortheme = CONFIG.color[theme];
  const borrowed = (/^cannot borrow `(.+)` as mutable more than once at a time/.exec(
    diag.message
  ) ?? [])[1];
  const errorline = diag.range.start.line;
  const fromline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("first mutable borrow occurs here")
  )[0]?.location.range.start.line;
  const toline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("first borrow later used here")
  )[0]?.location.range.end.line;
  if (borrowed === undefined || fromline === undefined || toline === undefined) {
    return "cannot parse diagnostics";
  }
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
}

function image502(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const borrowednull = /^cannot borrow `\*?(.+)` as (im)?mutable/.exec(diag.message);
  if (borrowednull === null) {
    return "cannot parse diagnostics";
  }
  const borrowed = borrowednull[1];
  // whether the error point is immutable.
  const isimm = borrowednull[2] === "im";
  const errorline = diag.range.start.line;
  const fromline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("borrow occurs here")
  )[0]?.location.range.start.line;
  const toline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("borrow later used here")
  )[0]?.location.range.end.line;
  if (borrowed === undefined || fromline === undefined || toline === undefined) {
    return "cannot parse related diagnostics";
  }
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  const region = `\`${borrowed}\` borrowed ${isimm ? "" : "im"}mutably in this region`;
  const point =
    `\`${borrowed}\` borrowed ${isimm ? "im" : ""}mutably here, ` +
    `conflicting with the previous borrow`;
  const tip =
    `tip: move the ${isimm ? "im" : ""}mutable borrow ` +
    `out of the ${isimm ? "" : "im"}mutable borrow area`;
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
}

function image503(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const borrowed = (/^cannot use `(.+)` because it was mutably borrowed/.exec(diag.message) ??
    [])[1];
  const errorline = diag.range.start.line;
  const fromline = diag.relatedInformation?.filter((d) => d.message.endsWith("is borrowed here"))[0]
    ?.location.range.start.line;
  const toline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("borrow later used here")
  )[0]?.location.range.end.line;
  if (borrowed === undefined || fromline === undefined || toline === undefined) {
    return "cannot parse diagnostics";
  }
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
}

function image505(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const borrowed = (/^cannot move out of `(.+)` because it is borrowed/.exec(diag.message) ??
    [])[1];
  const errorline = diag.range.start.line;
  const fromline = diag.relatedInformation?.filter((d) => d.message.endsWith("occurs here"))[0]
    ?.location.range.start.line;
  const toline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("borrow later used here")
  )[0]?.location.range.end.line;
  if (borrowed === undefined || fromline === undefined || toline === undefined) {
    return "cannot parse diagnostics";
  }
  // TODO: parse movein
  const movein = "";
  const xshift = getXshift(editor, fromline, toline) * CONFIG.charwidth;
  const imm = `\`${borrowed}\` borrowed in this region`;
  const mut = `\`${borrowed}\` moved${movein}`;
  const tip =
    "tip: the move of a value should happen when it is not borrowed.\nafter the move, the value can no longer be borrowed";
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

function image506(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const borrowed = (/^cannot assign to `(.+)` because it is borrowed/.exec(diag.message) ?? [])[1];
  const errorline = diag.range.start.line;
  const fromline = diag.relatedInformation?.filter(
    (d) => d.message.endsWith("occurs here") || d.message.endsWith("is borrowed here")
  )[0]?.location.range.start.line;
  const toline = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("borrow later used here")
  )[0]?.location.range.end.line;
  if (borrowed === undefined || fromline === undefined || toline === undefined) {
    return "cannot parse diagnostics";
  }
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
}

function image597(
  editor: vscode.TextEditor,
  diag: vscode.Diagnostic,
  theme: keyof typeof CONFIG.color
): [Svg, number] | string {
  const colortheme = CONFIG.color[theme];
  const borrowed = (/`(.+)` does not live long enough/.exec(diag.message) ?? [])[1];
  const validfrom = diag.range.start.line;
  const validto = diag.relatedInformation?.filter((d) =>
    d.message.endsWith("dropped here while still borrowed")
  )[0]?.location.range.end.line;
  const lateruseObj = diag.relatedInformation?.filter(
    (d) =>
      d.message.endsWith("borrow later used here") || d.message.endsWith("borrow later stored here")
  )[0];
  const laterMightUse = diag.relatedInformation?.filter((d) =>
    d.message.startsWith("borrow might be used here,")
  )[0];
  const shouldStatic = diag.relatedInformation?.filter((d) =>
    d.message.endsWith(" is borrowed for `'static`")
  )[0]?.location.range.end.line;
  if (borrowed === undefined || validfrom === undefined || validto === undefined) {
    return "cannot parse diagnostics";
  }
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
    return "cannot parse diagnostics";
  }
}
