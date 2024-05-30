import * as vscode from "vscode";

export type ErrorvizConfig = {
  fontsize: number,
  charwidth: number,
  lineheight: number,
  arrowsize: number,
  color: ErrorvizColorTheme,
};

export type ErrorvizColorTheme = Record<ErrorvizColorThemeName, ErrorvizColorThemeValues>;
export type ErrorvizColorThemeName = "light" | "dark";
// color choices:
//  vscode command: generate color theme from current settings
//   error: token.error-token
//   info: token.info-token
//   info2: token.debug-token
//   tip: entity.name.label
export type ErrorvizColorThemeValues = Record<"error" | "info" | "info2" | "tip", Color>;
type Color = string;

const fontsize = vscode.workspace.getConfiguration("editor").get<number>("fontSize") ?? 14;

export const CONFIG: ErrorvizConfig = {
  fontsize: fontsize,
  charwidth: 9,
  lineheight: Math.max(8, Math.round(1.35 * fontsize)),
  arrowsize: 6,
  color: {
    light: {
      error: "#CD3131",
      info: "#316BCD",
      info2: "#800080",
      tip: "#000000",
    },
    dark: {
      error: "#F44747",
      info: "#6796E6",
      info2: "#B267E6",
      tip: "#C8C8C8",
    },
  },
};
