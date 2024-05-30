import { errorvizHandlersMap } from "./errorviz/handlers";

/**
 * a set containing all error codes that possibly have an intervention.
 */
export const supportedErrorcodes = new Set([
  ...errorvizHandlersMap.keys(),
]);