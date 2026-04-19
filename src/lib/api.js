export const CLAUDE_URL = "/api/claude";
export const AI_HEADERS = { "Content-Type": "application/json" };

export function claudeHeaders(session) {
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}
