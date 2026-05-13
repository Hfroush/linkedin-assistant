"use server";

import { anthropic } from "@/lib/anthropic";
import { getVoiceProfileForAccount } from "@/lib/voice-profile";
import { getPublishedPostsWithMetrics, getAccountLearningStatus } from "@/db/queries";
import { getActiveAccountId } from "@/lib/account";
import { db } from "@/db/client";
import { weeklyDigests } from "@/db/schema";
import { randomUUID } from "crypto";

const DIGEST_MIN_POSTS_WITH_METRICS = 3;

export async function generateDigest(accountId?: number): Promise<string> {
  const resolvedAccountId = accountId ?? (await getActiveAccountId());
  const posts = await getPublishedPostsWithMetrics(resolvedAccountId);

  // Only include posts with impressions entered (real metrics data)
  const postsWithMetrics = posts.filter(
    (p) => p.impressions != null && p.impressions > 0 && p.engagementRate != null
  );

  // Real guard: require at least 3 posts with actual metrics before calling Claude
  if (postsWithMetrics.length < DIGEST_MIN_POSTS_WITH_METRICS) {
    return "Not enough posts with metrics yet. Enter impressions for at least 3 published posts to generate a weekly digest.";
  }

  // Compute average engagement rate
  const avgRate =
    postsWithMetrics.reduce((sum, p) => sum + (p.engagementRate ?? 0), 0) /
    postsWithMetrics.length;

  const aboveAverage = postsWithMetrics.filter(
    (p) => (p.engagementRate ?? 0) > avgRate
  );
  const belowAverage = postsWithMetrics.filter(
    (p) => (p.engagementRate ?? 0) <= avgRate
  );

  // Find top tag combinations from above-average posts
  const tagComboCounts: Record<string, number> = {};
  for (const p of aboveAverage) {
    if (p.hookType && p.narrativeStructure) {
      const key = `${p.hookType} + ${p.narrativeStructure}`;
      tagComboCounts[key] = (tagComboCounts[key] ?? 0) + 1;
    }
  }
  const topCombos = Object.entries(tagComboCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 2)
    .map(([combo]) => combo);

  // Build data summary for Claude
  const dataSummary = [
    `Total posts analyzed: ${postsWithMetrics.length}`,
    `Average engagement rate: ${(avgRate * 100).toFixed(2)}%`,
    `Posts above average: ${aboveAverage.length} — hook/narrative combos: ${aboveAverage.slice(0, 3).map((p) => `${p.hookType ?? "—"}/${p.narrativeStructure ?? "—"} (${((p.engagementRate ?? 0) * 100).toFixed(1)}%)`).join(", ")}`,
    `Posts below average: ${belowAverage.length} — examples: ${belowAverage.slice(0, 2).map((p) => `${p.hookType ?? "—"}/${p.narrativeStructure ?? "—"}`).join(", ")}`,
    `Top performing tag combos: ${topCombos.length > 0 ? topCombos.join("; ") : "not enough data"}`,
  ].join("\n");

  // Fetch edit learning status for this account
  const learningStatus = await getAccountLearningStatus(resolvedAccountId);
  const learningSection =
    learningStatus.correctionsCount === 0
      ? "No learning data yet — this account has not had any published versions logged."
      : learningStatus.hasAddendum
        ? `Voice profile last synthesised from ${learningStatus.correctionsCount} published corrections. Last synthesis: ${learningStatus.lastResynthAt?.toLocaleDateString() ?? "unknown"}.`
        : `${learningStatus.correctionsCount} correction(s) captured — voice profile re-synthesis not yet triggered (threshold: 5).`;

  // Call Claude with cached voice profile (D-08: same pattern as generate-draft.ts)
  const voiceProfileText = await getVoiceProfileForAccount(resolvedAccountId);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 200,
    system: [
      {
        type: "text",
        text: voiceProfileText,
        cache_control: { type: "ephemeral" },
      },
      {
        type: "text",
        text: "You are a performance analyst for Houtan's LinkedIn content. Write a weekly digest in his analytical, direct voice — 2-3 sentences max. Cover: what performed above average, what underperformed, and which tag combinations are top-performing. Be specific and concrete, not generic. Do not use headers or bullet points — just tight prose.",
      },
    ],
    messages: [
      {
        role: "user",
        content: `Here is this week's performance data:\n\n${dataSummary}\n\nEdit Learning Status: ${learningSection}\n\nWrite the weekly digest.`,
      },
    ],
  });

  const digestText =
    response.content[0]?.type === "text" ? response.content[0].text : "";

  // Store in weeklyDigests table (D-07) — structured JSON per critical review feedback
  const weekEnding = new Date().toISOString().split("T")[0];
  await db.insert(weeklyDigests).values({
    id: randomUUID(),
    weekEnding,
    digestJson: JSON.stringify({
      text: digestText,
      overallAverage: avgRate,
      aboveAverageCount: aboveAverage.length,
      underperformingCount: belowAverage.length,
    }),
    accountId: resolvedAccountId,
    createdAt: new Date(),
  });

  return digestText;
}
