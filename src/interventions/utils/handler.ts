export type HandlerResult<T> = HandlerSuccess<T> | HandlerUnsuccessful;

export type HandlerUnsuccessful =
  | HandlerInapplicable
  | HandlerFailed;

export type HandlerSuccess<T> = { type: 'success', data: T };

export type HandlerInapplicable = { type: 'inapplicable', context?: string };
export type HandlerFailed = { type: 'render_error', context: string };

export function isHandlerUnsuccessful<T>(result: HandlerResult<T>): result is HandlerUnsuccessful {
  return result.type === 'inapplicable' || result.type === 'render_error';
}

export type H<T = never> = {
  success(data: T): HandlerSuccess<T>
  inapplicable(context?: string): HandlerInapplicable
  failed(context: string): HandlerFailed
};

/**
 * this `h` shouldn't be used directly.
 * instead, it provides a convenient way to redeclare `h` functions
 *  for a given handler success type, since the type of this `h`, `H<never>`
 *  can be reassigned to any other `H<whatever>` type.
 * 
 * ```example
 * // intervention-type/handlers/_utils.ts
 * import { h as handler, type H } from '.../interventions/utils/handler'
 * export const h: H<MyHandlerSuccessType> = handler
 * ```
 */
export const h: H<never> = {
  success(data) {
    return { type: 'success', data };
  },
  inapplicable(context?) {
    return { type: 'inapplicable', context };
  },
  failed(context) {
    return { type: 'render_error', context };
  },
};