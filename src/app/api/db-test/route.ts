import { neon } from "@neondatabase/serverless";

export const dynamic = "force-dynamic";

export async function GET() {
  const url = process.env["DATABASE_URL"];

  if (!url) {
    return Response.json({ error: "DATABASE_URL not set" }, { status: 500 });
  }

  // Show that we have the URL (first 50 chars, safe to log)
  const urlPreview = url.slice(0, 50) + "...";

  // Test raw fetch to the Neon HTTP endpoint first
  const host = url.match(/@([^/]+)/)?.[1];
  const apiEndpoint = host
    ? `https://api.${host.replace(/^ep-[^.]+\./, "")}/sql`
    : null;

  let fetchResult: string;
  try {
    const r = await fetch(apiEndpoint!, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{}",
      cache: "no-store",
    });
    fetchResult = `HTTP ${r.status}`;
  } catch (e: unknown) {
    const err = e as Error & { cause?: Error };
    fetchResult = `fetch threw: ${err.message} | cause: ${err.cause?.message ?? "none"}`;
  }

  // Test via Neon SDK
  let sdkResult: string;
  try {
    const sql = neon(url);
    const rows = await sql.query("SELECT 1 as test", []);
    sdkResult = `OK: ${JSON.stringify(rows)}`;
  } catch (e: unknown) {
    const err = e as Error & { cause?: Error & { cause?: unknown } };
    sdkResult = `SDK threw: ${err.message} | cause: ${err.cause?.message ?? "none"} | cause.cause: ${String(err.cause?.cause ?? "none")}`;
  }

  return Response.json({ urlPreview, apiEndpoint, fetchResult, sdkResult });
}
