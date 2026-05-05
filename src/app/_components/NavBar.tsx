"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function NavBar() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-200">
      <div className="max-w-6xl mx-auto flex items-center gap-6 px-6 h-12">
        <Link
          href="/"
          className={`text-sm font-semibold text-gray-900${
            pathname === "/" ? " border-b-2 border-blue-600 pb-1" : ""
          }`}
        >
          Draft
        </Link>
        <Link
          href="/discover"
          className={`text-sm font-semibold text-gray-900${
            pathname === "/discover" ? " border-b-2 border-blue-600 pb-1" : ""
          }`}
        >
          Discover
        </Link>
      </div>
    </nav>
  );
}
