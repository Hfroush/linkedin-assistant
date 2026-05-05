"use client";

export function WeeklyDigestCard({ digestText }: { digestText: string }) {
  return (
    <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-gray-800 leading-relaxed">
      <p className="text-xs font-medium text-blue-600 mb-1 uppercase tracking-wide">
        Weekly Digest
      </p>
      <p>{digestText}</p>
    </div>
  );
}
