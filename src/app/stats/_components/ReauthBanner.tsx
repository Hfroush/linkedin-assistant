"use client";

import { useState } from "react";

/**
 * Re-auth reminder banner. Phase 4 placeholder — always hidden.
 * Activates in Phase 5 when LinkedIn OAuth token expiry check is wired.
 *
 * Props (Phase 5 will pass these):
 *   daysUntilExpiry: number — days until the 60-day OAuth token expires
 *   show: boolean — true when daysUntilExpiry <= 7
 */
export function ReauthBanner({
  daysUntilExpiry = 0,
  show = false,
}: {
  daysUntilExpiry?: number;
  show?: boolean;
}) {
  const [dismissed, setDismissed] = useState(false);

  // Phase 4: always hidden. Phase 5 will pass show=true when token is near expiry.
  if (!show || dismissed) return null;

  return (
    <div className="flex items-center justify-between rounded-md border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800 mb-4">
      <span>
        Your LinkedIn connection expires in{" "}
        <strong>{daysUntilExpiry} day{daysUntilExpiry !== 1 ? "s" : ""}</strong>.
        Re-authenticate to keep metrics syncing.
      </span>
      <button
        onClick={() => setDismissed(true)}
        className="ml-4 text-amber-600 hover:text-amber-800 font-medium"
        aria-label="Dismiss re-auth reminder"
      >
        Dismiss
      </button>
    </div>
  );
}
