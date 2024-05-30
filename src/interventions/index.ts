import { errorvizHandlersMap } from "./errorviz/handlers";
import { inlineSuggestionHandlersMap } from "./inline-suggestions/handlers";

/**
 * a set containing all error codes that possibly have an intervention.
 */
export const supportedErrorcodes = new Set([
  ...errorvizHandlersMap.keys(),
  ...inlineSuggestionHandlersMap.keys(),
]);