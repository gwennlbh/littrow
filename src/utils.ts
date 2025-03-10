export function entries<T extends Record<string, any>>(
  obj: T
): Array<[keyof T, T[keyof T]]> {
  return Object.entries(obj)
}

export type satisfy<base, t extends base> = t
