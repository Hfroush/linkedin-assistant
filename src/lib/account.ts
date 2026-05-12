import { cookies } from "next/headers";

export type AccountSlug = "personal" | "ucl" | "startup";

export const ACCOUNT_SLUGS: AccountSlug[] = ["personal", "ucl", "startup"];

// Canonical map: slug → DB account id (seeded as 1, 2, 3 in Plan 01)
export const ACCOUNT_ID_MAP: Record<AccountSlug, number> = {
  personal: 1,
  ucl: 2,
  startup: 3,
};

export const ACCOUNT_SLUG_MAP: Record<number, AccountSlug> = {
  1: "personal",
  2: "ucl",
  3: "startup",
};

export const ACCOUNT_DISPLAY_NAMES: Record<AccountSlug, string> = {
  personal: "Houtan Personal",
  ucl: "UCL EdTech Labs",
  startup: "Startup Labs",
};

/**
 * Reads the x-active-account cookie from the request headers.
 * Returns the corresponding account DB id (1, 2, or 3).
 * Defaults to personal (id=1) if cookie is absent or invalid.
 *
 * NOTE: cookies() is async in Next.js 15 — always await.
 */
export async function getActiveAccountId(): Promise<number> {
  const cookieStore = await cookies();
  const slug = cookieStore.get("x-active-account")?.value ?? "personal";
  // Whitelist check — reject tampered cookie values
  const validSlug = ACCOUNT_SLUGS.includes(slug as AccountSlug)
    ? (slug as AccountSlug)
    : "personal";
  return ACCOUNT_ID_MAP[validSlug];
}

export async function getActiveAccountSlug(): Promise<AccountSlug> {
  const cookieStore = await cookies();
  const slug = cookieStore.get("x-active-account")?.value ?? "personal";
  return ACCOUNT_SLUGS.includes(slug as AccountSlug) ? (slug as AccountSlug) : "personal";
}
