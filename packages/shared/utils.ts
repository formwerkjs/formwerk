export function isCallable(fn: unknown): fn is (...args: any[]) => any {
  return typeof fn === 'function';
}

export const isObject = (obj: unknown): obj is Record<string, unknown> =>
  obj !== null && !!obj && typeof obj === 'object' && !Array.isArray(obj);

export function isIndex(value: unknown): value is number {
  return Number(value) >= 0;
}

/**
 * Constructs a path with dot paths for arrays to use brackets to be compatible with vee-validate path syntax
 */
export function normalizeFormPath(path: string): string {
  const pathArr = path.split('.');
  if (!pathArr.length) {
    return '';
  }

  let fullPath = String(pathArr[0]);
  for (let i = 1; i < pathArr.length; i++) {
    if (isIndex(pathArr[i])) {
      fullPath += `[${pathArr[i]}]`;
      continue;
    }

    fullPath += `.${pathArr[i]}`;
  }

  return fullPath;
}

export function toNumber(value: string): number | string {
  const n = parseFloat(value);

  return isNaN(n) ? value : n;
}
