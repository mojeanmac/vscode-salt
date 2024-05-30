import { newSvg } from "./utils/svg";

import type { Svg } from "@svgdotjs/svg.js";

const TRIANGLE_SIDE_LEN = 9;

/**
 * Triangle for Shown visualization. Pointing down.
 */
export function triangleShown(): Svg {
  const SL = TRIANGLE_SIDE_LEN;
  const sign = newSvg(SL, SL);
  sign.path(`M0,0 L${SL},0 L${SL / 2},${SL}`).fill("#ff3300");
  return sign;
}

/**
 * Triangle for hidden visualization. Pointing right.
 */
export function triangleAvail(): Svg {
  const SL = TRIANGLE_SIDE_LEN;
  const sign = newSvg(SL, SL);
  sign.path(`M0,0 L${SL},${SL / 2} L0,${SL}`).fill("#ff3300");
  return sign;
}
