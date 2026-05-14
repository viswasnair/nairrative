import { loadCacheRow, saveCacheRow } from "./db";

/**
 * @typedef {Object} CacheOptions
 * @property {string} table - Supabase table name
 * @property {string} lsDataKey - localStorage key for the cached data
 * @property {string} lsFpKey - localStorage key for the fingerprint
 * @property {string} fingerprint - current books fingerprint
 * @property {object|null} session - active Supabase session, or null
 */

/**
 * Loads AI result from localStorage → Supabase → null.
 * @param {CacheOptions} params
 * @returns {Promise<any|null>}
 */
export async function loadCachedData({ table, lsDataKey, lsFpKey, fingerprint, session }) {
  const cachedFp = localStorage.getItem(lsFpKey);
  const cachedResult = localStorage.getItem(lsDataKey);
  if (cachedFp === fingerprint && cachedResult) {
    try { return JSON.parse(cachedResult); } catch { /* malformed — fall through */ }
  }
  try {
    const { data } = await loadCacheRow(table, session?.user?.id ?? null);
    if (data?.data) {
      localStorage.setItem(lsDataKey, JSON.stringify(data.data));
      localStorage.setItem(lsFpKey, fingerprint);
      return data.data;
    }
  } catch { /* fall through to null */ }
  return null;
}

/**
 * Saves AI result to localStorage and upserts to Supabase.
 * @param {CacheOptions & { data: any }} params
 * @returns {Promise<void>}
 */
export async function saveCachedData({ table, lsDataKey, lsFpKey, fingerprint, data, session }) {
  localStorage.setItem(lsDataKey, JSON.stringify(data));
  localStorage.setItem(lsFpKey, fingerprint);
  if (!session) return;
  try {
    await saveCacheRow(table, session.user.id, fingerprint, data);
  } catch (e) { console.error(`Failed to save ${table} to Supabase:`, e); }
}
