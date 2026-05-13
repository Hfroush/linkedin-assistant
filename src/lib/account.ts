import { cookies } from "next/headers";

// Re-export shared constants so existing server-side imports don't break
export type { AccountSlug } from "./account-shared";
export { ACCOUNT_SLUGS, ACCOUNT_ID_MAP, ACCOUNT_SLUG_MAP, ACCOUNT_DISPLAY_NAMES } from "./account-shared";
import { ACCOUNT_SLUGS as _SLUGS, ACCOUNT_ID_MAP as _ID_MAP } from "./account-shared";
import type { AccountSlug as _AccountSlug } from "./account-shared";

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
  const validSlug = _SLUGS.includes(slug as _AccountSlug)
    ? (slug as _AccountSlug)
    : "personal";
  return _ID_MAP[validSlug];
}

export async function getActiveAccountSlug(): Promise<_AccountSlug> {
  const cookieStore = await cookies();
  const slug = cookieStore.get("x-active-account")?.value ?? "personal";
  return _SLUGS.includes(slug as _AccountSlug) ? (slug as _AccountSlug) : "personal";
}
