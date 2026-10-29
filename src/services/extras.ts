/**
 * Package add-ons ("extras"). Admins attach extras to a package; customers tick the
 * ones they want. Prices always come from the database, never from the app.
 */

/** "[3,1]", "1,3", [1,3] -> [1, 3] (unique, sorted). */
export function parseExtraIds(v: unknown): number[] {
  let list: unknown[] = [];
  if (Array.isArray(v)) list = v;
  else if (typeof v === 'string' && v.trim()) {
    const s = v.trim();
    if (s.startsWith('[')) {
      try { const j = JSON.parse(s); if (Array.isArray(j)) list = j; } catch { /* ignore */ }
    } else list = s.split(',');
  } else if (typeof v === 'number') list = [v];
  const ids = list.map((x) => parseInt(String(x), 10)).filter((n) => Number.isInteger(n) && n > 0);
  return [...new Set(ids)].sort((a, b) => a - b);
}

/** Stored form for carts.extra_ids: null when nothing is chosen, else "[1,3]". */
export function extraIdsKey(ids: number[]): string | null {
  return ids.length ? JSON.stringify(ids) : null;
}

/** Active extras attached to a package (needs the package loaded with `extras`). */
export function availableExtras(pkg: any): any[] {
  return (pkg?.extras || []).filter((e: any) => (e.status ?? 'active') === 'active');
}

/** The chosen extras that are still attached and active (silently drops removed ones). */
export function chosenExtras(pkg: any, ids: number[]): any[] {
  const wanted = new Set(ids);
  return availableExtras(pkg).filter((e: any) => wanted.has(Number(e.id)));
}

export function extrasTotal(extras: any[]): number {
  return extras.reduce((sum, e) => sum + Math.max(0, Number(e.price) || 0), 0);
}

/** Priced snapshot kept on the order line. */
export function extrasSnapshot(extras: any[]) {
  return extras.map((e) => ({ id: e.id, name: e.name, name_ar: e.name_ar ?? null, price: Math.max(0, Number(e.price) || 0) }));
}

/** order_products.extras (JSON text) -> array. */
export function parseSnapshot(v: unknown): Array<{ id: number; name: string; name_ar: string | null; price: number }> {
  if (!v) return [];
  try { const j = typeof v === 'string' ? JSON.parse(v) : v; return Array.isArray(j) ? j : []; } catch { return []; }
}
