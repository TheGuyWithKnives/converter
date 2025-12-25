export function isHTMLImageElement(element: any): element is HTMLImageElement {
  return element instanceof HTMLImageElement;
}

export function isHTMLCanvasElement(element: any): element is HTMLCanvasElement {
  return element instanceof HTMLCanvasElement;
}

export function isFile(value: any): value is File {
  return value instanceof File;
}

export function isImageData(value: any): value is ImageData {
  return value instanceof ImageData;
}

export function isError(value: any): value is Error {
  return value instanceof Error && typeof value.message === 'string';
}

export function isString(value: any): value is string {
  return typeof value === 'string';
}

export function isNumber(value: any): value is number {
  return typeof value === 'number' && !isNaN(value) && isFinite(value);
}

export function isObject(value: any): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

export function isValidURL(value: string): boolean {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

export function isValidImageFile(file: File): boolean {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  return file instanceof File && validTypes.includes(file.type);
}

export function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${JSON.stringify(value)}`);
}

export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

export function isNonEmptyString(value: any): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

export function isPositiveNumber(value: any): value is number {
  return isNumber(value) && value > 0;
}

export function isValidHash(value: any): value is string {
  return (
    typeof value === 'string' &&
    value.length === 64 &&
    /^[a-f0-9]+$/.test(value)
  );
}

export function assertDefined<T>(
  value: T | null | undefined,
  message?: string
): asserts value is T {
  if (!isDefined(value)) {
    throw new Error(message || 'Value is null or undefined');
  }
}

export function assertString(value: any, message?: string): asserts value is string {
  if (!isString(value)) {
    throw new Error(message || 'Value is not a string');
  }
}

export function assertNumber(value: any, message?: string): asserts value is number {
  if (!isNumber(value)) {
    throw new Error(message || 'Value is not a valid number');
  }
}
