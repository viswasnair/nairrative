// ── Auth adapter ───────────────────────────────────────────────────────────
// All Supabase Auth calls flow through this file.
// To swap Supabase Auth for another provider (e.g. Cognito), replace only
// the internals here — hook/component code stays unchanged.

import { supabase } from "./supabase";

// Returns the current session object, or null if logged out.
export async function getSession() {
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function signIn(email, password) {
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signOut() {
  return supabase.auth.signOut();
}

// Registers a callback for auth state changes.
// Returns a cleanup function that unsubscribes the listener.
export function onAuthStateChange(callback) {
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback);
  return () => subscription.unsubscribe();
}
