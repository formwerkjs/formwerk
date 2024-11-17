export function toNearestMultipleOf(value: number, multiple: number, round?: boolean) {
  const smallerMultiple = (value / multiple) * multiple;
  const largerMultiple = smallerMultiple + multiple;

  const result = value - smallerMultiple >= largerMultiple - value ? largerMultiple : smallerMultiple;
  // Return of closest of two
  return round ? Math.round(result) : Math.trunc(result);
}
