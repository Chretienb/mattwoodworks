export function deepMerge<T extends Record<string, unknown>>(
  base: T,
  patch: Partial<T> | Record<string, unknown>,
): T {
  const out = { ...base }
  for (const key of Object.keys(patch)) {
    const p = patch[key as keyof typeof patch]
    if (p === undefined) continue
    const b = base[key as keyof T]
    if (Array.isArray(p)) {
      ;(out as Record<string, unknown>)[key] = p
    } else if (
      p !== null &&
      typeof p === 'object' &&
      typeof b === 'object' &&
      b !== null &&
      !Array.isArray(b) &&
      !Array.isArray(p)
    ) {
      ;(out as Record<string, unknown>)[key] = deepMerge(
        b as Record<string, unknown>,
        p as Record<string, unknown>,
      )
    } else {
      ;(out as Record<string, unknown>)[key] = p
    }
  }
  return out
}
