"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { switchAccount } from "@/app/actions/switch-account";
import { ACCOUNT_DISPLAY_NAMES, type AccountSlug } from "@/lib/account-shared";

const ACCOUNT_OPTIONS: { slug: AccountSlug; label: string }[] = [
  { slug: "personal", label: ACCOUNT_DISPLAY_NAMES.personal },
  { slug: "ucl", label: ACCOUNT_DISPLAY_NAMES.ucl },
  { slug: "startup", label: ACCOUNT_DISPLAY_NAMES.startup },
];

export default function AccountSwitcher({ activeSlug }: { activeSlug: AccountSlug }) {
  const router = useRouter();
  const [switching, setSwitching] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const slug = e.target.value as AccountSlug;
    if (slug === activeSlug) return; // no-op if same account
    setSwitching(true);
    await switchAccount(slug);
    router.refresh(); // re-renders all server components with new cookie
    setSwitching(false);
  }

  return (
    <select
      value={activeSlug}
      onChange={handleChange}
      disabled={switching}
      aria-label="Switch account"
      className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-0.5 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 disabled:opacity-50"
    >
      {ACCOUNT_OPTIONS.map(({ slug, label }) => (
        <option key={slug} value={slug}>
          {label}
        </option>
      ))}
    </select>
  );
}
