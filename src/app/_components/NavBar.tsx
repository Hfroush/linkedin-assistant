"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AccountSwitcher from "./AccountSwitcher";
import type { AccountSlug } from "@/lib/account";

export default function NavBar({ activeSlug }: { activeSlug: AccountSlug }) {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto flex items-center gap-6 px-6 h-12">
        <Link
          href="/"
          className={`text-sm font-semibold text-gray-900 dark:text-gray-100${
            pathname === "/" ? " border-b-2 border-blue-500 pb-1" : ""
          }`}
        >
          Draft
        </Link>
        <Link
          href="/discover"
          className={`text-sm font-semibold text-gray-900 dark:text-gray-100${
            pathname === "/discover" ? " border-b-2 border-blue-500 pb-1" : ""
          }`}
        >
          Discover
        </Link>
        <Link
          href="/stats"
          className={`text-sm font-semibold text-gray-900 dark:text-gray-100${
            pathname === "/stats" ? " border-b-2 border-blue-500 pb-1" : ""
          }`}
        >
          Stats
        </Link>
        <div className="ml-auto">
          <AccountSwitcher activeSlug={activeSlug} />
        </div>
      </div>
    </nav>
  );
}
