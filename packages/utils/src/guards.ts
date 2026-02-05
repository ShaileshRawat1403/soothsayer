// Type guards and utility predicates

// Check if value is defined (not null or undefined)
export function isDefined<T>(value: T | null | undefined): value is T {
  return value !== null && value !== undefined;
}

// Check if value is null or undefined
export function isNullish(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

// Check if value is a string
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

// Check if value is a non-empty string
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.trim().length > 0;
}

// Check if value is a number
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !Number.isNaN(value);
}

// Check if value is a positive number
export function isPositiveNumber(value: unknown): value is number {
  return isNumber(value) && value > 0;
}

// Check if value is a boolean
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

// Check if value is an object
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

// Check if value is an array
export function isArray<T = unknown>(value: unknown): value is T[] {
  return Array.isArray(value);
}

// Check if value is a non-empty array
export function isNonEmptyArray<T = unknown>(value: unknown): value is T[] {
  return isArray(value) && value.length > 0;
}

// Check if value is a function
export function isFunction(value: unknown): value is (...args: unknown[]) => unknown {
  return typeof value === 'function';
}

// Check if value is a Date
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

// Check if value is a valid UUID
export function isUUID(value: unknown): value is string {
  if (!isString(value)) return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(value);
}

// Check if value is a valid email
export function isEmail(value: unknown): value is string {
  if (!isString(value)) return false;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(value);
}

// Check if value is a valid URL
export function isURL(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// Check if value is a valid JSON string
export function isJSONString(value: unknown): value is string {
  if (!isString(value)) return false;
  try {
    JSON.parse(value);
    return true;
  } catch {
    return false;
  }
}

// Check if object has property
export function hasProperty<K extends string>(
  obj: unknown,
  key: K
): obj is Record<K, unknown> {
  return isObject(obj) && key in obj;
}

// Check if all properties are present
export function hasProperties<K extends string>(
  obj: unknown,
  keys: K[]
): obj is Record<K, unknown> {
  return isObject(obj) && keys.every((key) => key in obj);
}

// Check if value is in enum
export function isEnumValue<T extends Record<string, string | number>>(
  enumObj: T,
  value: unknown
): value is T[keyof T] {
  return Object.values(enumObj).includes(value as T[keyof T]);
}

// Assert never for exhaustive type checking
export function assertNever(value: never, message = 'Unexpected value'): never {
  throw new Error(`${message}: ${JSON.stringify(value)}`);
}

// Type-safe entries
export function typedEntries<T extends Record<string, unknown>>(
  obj: T
): [keyof T, T[keyof T]][] {
  return Object.entries(obj) as [keyof T, T[keyof T]][];
}

// Type-safe keys
export function typedKeys<T extends Record<string, unknown>>(obj: T): (keyof T)[] {
  return Object.keys(obj) as (keyof T)[];
}

// Filter nullish values from array
export function filterNullish<T>(arr: (T | null | undefined)[]): T[] {
  return arr.filter(isDefined);
}

// Get value with default
export function withDefault<T>(value: T | null | undefined, defaultValue: T): T {
  return isDefined(value) ? value : defaultValue;
}
