export const config = { runtime: "edge" };

export default function handler(req) {
  if (req.method === "OPTIONS")
    return new Response(null, { status: 204 });

  return new Response(
    JSON.stringify({ status: "ok", t: new Date().toISOString() }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
}
