export type Entity = Record<string, unknown>;
export type UrnIndex = Map<string, Entity>;

/**
 * Builds a Map from entityUrn to entity over LinkedIn's normalized
 * `included[]` array. A Map beats a plain object here because LinkedIn URNs
 * contain characters (`:`) that make object keys awkward, and `.has()`
 * comes for free.
 */
export function buildIndex(payload: unknown): UrnIndex {
  const index: UrnIndex = new Map();
  const included = getPath<unknown[]>(payload, "included");
  if (!Array.isArray(included)) return index;

  for (const entry of included) {
    if (!isEntity(entry)) continue;
    const urn = entry.entityUrn;
    if (typeof urn === "string") {
      index.set(urn, entry);
    }
  }

  return index;
}

/** Resolves a single URN reference. Dangling URNs are normal — returns undefined, never throws. */
export function resolve(index: UrnIndex, urn: unknown): Entity | undefined {
  if (typeof urn !== "string") return undefined;
  return index.get(urn);
}

/** Resolves an array (or array-like) of URN references, dropping any that don't resolve. */
export function resolveMany(index: UrnIndex, urns: unknown): Entity[] {
  if (!Array.isArray(urns)) return [];
  const result: Entity[] = [];
  for (const urn of urns) {
    const entity = resolve(index, urn);
    if (entity) result.push(entity);
  }
  return result;
}

/**
 * Finds entities whose `$type` ends with the given suffix, e.g.
 * `byType(index, "profile.Position")`. Matches on suffix, never the full
 * namespaced string, because LinkedIn changes namespaces without changing
 * structure.
 */
export function byType(index: UrnIndex, suffix: string): Entity[] {
  const result: Entity[] = [];
  for (const entity of index.values()) {
    const type = entity.$type;
    if (typeof type === "string" && type.endsWith(suffix)) {
      result.push(entity);
    }
  }
  return result;
}

/**
 * Safe nested-property access into an `unknown` value. This is the escape
 * hatch for `noUncheckedIndexedAccess` and LinkedIn's habit of omitting
 * keys — use it instead of chained optional access on `unknown`.
 */
export function getPath<T = unknown>(obj: unknown, ...keys: string[]): T | undefined {
  let current: unknown = obj;
  for (const key of keys) {
    if (!isIndexable(current)) return undefined;
    current = (current as Record<string, unknown>)[key];
  }
  return current as T | undefined;
}

function isIndexable(value: unknown): value is Record<string, unknown> | unknown[] {
  return typeof value === "object" && value !== null;
}

function isEntity(value: unknown): value is Entity {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
