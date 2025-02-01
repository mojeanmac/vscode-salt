
import { autoderef } from "./e0308";
import type { InlineSuggestionHandler } from "./_utils";

export const inlineSuggestionHandlersMap: Map<string, InlineSuggestionHandler> = new Map([
  // ["E0308", autoderef],
]);
