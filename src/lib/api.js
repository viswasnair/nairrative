export const LLM_URL = "/api/claude";
// Delay between sequential AI calls to stay within the API rate limit
export const INTER_REQUEST_DELAY_MS = 8000;

export function claudeHeaders(session) {
  const headers = { "Content-Type": "application/json" };
  if (session?.access_token) headers["Authorization"] = `Bearer ${session.access_token}`;
  return headers;
}
