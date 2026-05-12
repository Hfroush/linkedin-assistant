"use server";

import { cookies } from "next/headers";
import { ACCOUNT_SLUGS, type AccountSlug } from "@/lib/account";

/**
 * Sets the x-active-account cookie to the requested slug.
 * Input is whitelist-validated — invalid slugs are silently rejected.
 * The client calls router.refresh() after this action returns.
 * Do NOT call revalidatePath here — router.refresh() handles it.
 */
export async function switchAccount(slug: AccountSlug): Promise<void> {
  if (!ACCOUNT_SLUGS.includes(slug)) return; // whitelist guard — tamper protection
  const cookieStore = await cookies();
  cookieStore.set("x-active-account", slug, {
    httpOnly: false, // client component needs to read for optimistic UI updates
    maxAge: 60 * 60 * 24 * 365, // 1 year
    path: "/",
    sameSite: "lax",
  });
}
