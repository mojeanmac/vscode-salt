/**
 * generates an array of numbers in the interval [from, to)
 * 
 * assumes `from` and `to` are integers, and `from <= to`
 */
export function range(from: number, to: number): number[] {
  return Array.from({ length: to - from }).map((_, i) => i + from);
}

/**
 * gets the min and max values of a list of numbers
 */
export function minmax(...args: number[]): [min: number, max: number] {
  const min = Math.min(...args);
  const max = Math.max(...args);
  return [min, max];
}

/**
 * clamps a value within [min, max]
 */
export function clamp(x: number, min: number, max: number): number {
  return Math.min(Math.max(min, x), max);
}