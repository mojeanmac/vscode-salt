import type { CheckDiag } from "../_types";

export const checkAutoderef: CheckDiag<{
  expectedType: string;
  foundType: string;
}> = (diag) => {
  // note: can't surround foundType with backticks, since some things might not necessarily be an exact type (e.g. "expected `foo`, found integer"):
  //  in this case "integer" is not surrounded by backticks.
  const matchGroups = /^mismatched types\nexpected `(?<expectedType>.*)`, found (?<foundType>.*)$/.exec(diag.message)?.groups;
  if (!matchGroups) { return false; }
  let { expectedType, foundType } = matchGroups;
  if (foundType.startsWith("`") && foundType.endsWith("`")) {
    foundType = foundType.slice(1, -1);
  }
  return { expectedType, foundType };
};

//calls hideInlineSuggestion if the diagnostic is an autoderef error
// export function handleAutoderef()