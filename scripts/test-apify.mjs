// Quick Apify diagnostic — run with:
// node scripts/test-apify.mjs <linkedin-post-url>
//
// Example:
// node scripts/test-apify.mjs "https://www.linkedin.com/posts/..."

import { ApifyClient } from "apify-client";
import { readFileSync } from "fs";
import { resolve } from "path";

// Parse .env.local manually — no dotenv dependency needed
try {
  const envFile = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
  for (const line of envFile.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch {
  console.error("Could not read .env.local");
}

const ACTOR_ID = "electrifying_haircut/linkedin-post-scraper";
const postUrl = process.argv[2];

if (!postUrl) {
  console.error("Usage: node scripts/test-apify.mjs <linkedin-post-url>");
  process.exit(1);
}

if (!process.env.APIFY_API_KEY) {
  console.error("Missing APIFY_API_KEY in .env.local");
  process.exit(1);
}

if (!process.env.LINKEDIN_LI_AT) {
  console.error("Missing LINKEDIN_LI_AT in .env.local");
  process.exit(1);
}

const client = new ApifyClient({ token: process.env.APIFY_API_KEY });

console.log("Running actor:", ACTOR_ID);
console.log("Post URL:", postUrl);
console.log("li_at present:", !!process.env.LINKEDIN_LI_AT);
console.log("");

try {
  const cleanUrl = postUrl.split("?")[0].replace(/\/$/, "");
  // Try to extract the numeric activity ID and use the urn: feed URL format
  const activityMatch = cleanUrl.match(/(\d{17,20})/);
  const resolvedUrl = activityMatch
    ? `https://www.linkedin.com/feed/update/urn:li:activity:${activityMatch[1]}/`
    : cleanUrl;
  console.log("Clean URL:", cleanUrl);
  console.log("Resolved URL:", resolvedUrl);
  console.log("");

  const run = await client.actor(ACTOR_ID).call(
    { postUrl: resolvedUrl, li_at: process.env.LINKEDIN_LI_AT, jsessionid: process.env.LINKEDIN_JSESSIONID },
    { waitSecs: 60 }
  );

  console.log("Run status:", run.status);
  console.log("Run ID:", run.id);
  console.log("");

  const { items } = await client.dataset(run.defaultDatasetId).listItems();
  console.log("Items returned:", items.length);
  console.log("");
  console.log("Raw output:");
  console.log(JSON.stringify(items, null, 2));
} catch (err) {
  console.error("Error:", err.message);
  if (err.statusCode) console.error("Status code:", err.statusCode);
}
