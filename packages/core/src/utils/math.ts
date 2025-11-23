export function toNearestMultipleOf(value: number, multiple: number, round?: boolean) {
  const smallerMultiple = (value / multiple) * multiple;
  const largerMultiple = smallerMultiple + multiple;

  const result = value - smallerMultiple >= largerMultiple - value ? largerMultiple : smallerMultiple;

  // Return of closest of two
  if (round) {
    return Math.round(result);
  }

  // For decimal steps, we need to round to the same precision as the step
  // to avoid floating point arithmetic issues
  const decimalPlaces = (multiple.toString().split('.')[1] || '').length;
  if (decimalPlaces > 0) {
    return Number(result.toFixed(decimalPlaces));
  }

  return Math.trunc(result);
}
