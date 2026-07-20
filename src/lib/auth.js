// ── Auth adapter ───────────────────────────────────────────────────────────
// All Supabase Auth calls flow through this file.
// To swap Supabase Auth for another provider (e.g. Cognito), replace only
// the internals here — hook/component code stays unchanged.

import { supabase } from "./supabase";

/**
 * @returns {Promise<object|null>} Active session or null if logged out
 */
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

/**
 * @param {string} email
 * @param {string} password
 * @returns {Promise<{data: object, error: object|null}>}
 */
export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

/**
 * @returns {Promise<{error: object|null}>}
 */
export async function signOut() {
  return supabase.auth.signOut();
}

/**
 * Registers a callback for auth state changes.
 * @param {Function} callback - Invoked with (event, session) on every auth state change
 * @returns {() => void} Cleanup function that unsubscribes the listener
 */
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
