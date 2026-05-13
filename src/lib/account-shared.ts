export type AccountSlug = "personal" | "ucl" | "startup";

export const ACCOUNT_SLUGS: AccountSlug[] = ["personal", "ucl", "startup"];

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
