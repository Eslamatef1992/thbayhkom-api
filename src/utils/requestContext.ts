import { AsyncLocalStorage } from 'async_hooks';

/** Per-request language, so presenters can localize without threading `lang` through every call. */
const store = new AsyncLocalStorage<{ lang: 'en' | 'ar' }>();

export const runWithLang = <T>(lang: 'en' | 'ar', fn: () => T): T => store.run({ lang }, fn);
export const currentLang = (): 'en' | 'ar' => store.getStore()?.lang ?? 'en';

/** Arabic value when the request is Arabic and one exists, else the default/English value. */
export function localized(row: any, field: string): any {
  if (!row) return null;
  if (currentLang() === 'ar') {
    const ar = row[`${field}_ar`];
    if (ar != null && String(ar).trim() !== '') return ar;
  }
  return row[field] ?? row[`${field}_en`] ?? null;
}
