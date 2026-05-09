import { supabase } from "./supabase";

// Loads AI result from localStorage → Supabase → null.
// Returns the cached data if found and fingerprint matches, otherwise null.
export async function loadCachedData({ table, lsDataKey, lsFpKey, fingerprint, session }) {
  const cachedFp = localStorage.getItem(lsFpKey);
  const cachedResult = localStorage.getItem(lsDataKey);
  if (cachedFp === fingerprint && cachedResult) {
    try { return JSON.parse(cachedResult); } catch { /* malformed — fall through */ }
  }
  try {
    const query = supabase.from(table).select("data");
    const { data } = await (session ? query.eq("user_id", session.user.id) : query).maybeSingle();
    if (data?.data) {
      localStorage.setItem(lsDataKey, JSON.stringify(data.data));
      localStorage.setItem(lsFpKey, fingerprint);
      return data.data;
    }
  } catch { /* fall through to null */ }
  return null;
}

// Saves AI result to localStorage and upserts to Supabase.
export async function saveCachedData({ table, lsDataKey, lsFpKey, fingerprint, data, session }) {
  localStorage.setItem(lsDataKey, JSON.stringify(data));
  localStorage.setItem(lsFpKey, fingerprint);
  if (!session) return;
  try {
    await supabase.from(table).upsert(
      { user_id: session.user.id, fingerprint, data },
      { onConflict: "user_id" }
    );
  } catch (e) { console.error(`Failed to save ${table} to Supabase:`, e); }
}
