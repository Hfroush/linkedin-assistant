"use server";

import { eq, sql } from "drizzle-orm";
import { db } from "@/db/client";
import { posts, voiceCorrections, accounts } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { logger } from "@/lib/logger";

/**
 * Logs the published version of a draft:
 * 1. Reads the existing draft_text from the posts row
 * 2. Updates posts: selection_state='published', published_text=publishedText, status='published'
 * 3. Inserts a voice_corrections row
 * 4. Fires off extractEditPatterns asynchronously (non-blocking)
 * 5. Checks corrections count and conditionally fires resynthesizeVoiceAddendum
 *
 * accountId is passed explicitly — do NOT read from cookies here.
 * Passing it explicitly prevents misuse from non-request contexts.
 */
export async function logPublishedVersion({
  postId,
  publishedText,
  accountId,
}: {
  postId: string;
  publishedText: string;
  accountId: number;
}): Promise<{ success: boolean; correctionId?: string }> {
  // Input validation
  if (!postId || postId.trim().length === 0) throw new Error("postId is required");
  if (!publishedText || publishedText.trim().length === 0)
    throw new Error("Published text cannot be empty");
  if (publishedText.length > 10000)
    throw new Error("Published text too long (max 10,000 characters)");
  if (!Number.isInteger(accountId) || accountId < 1 || accountId > 3)
    throw new Error("Invalid accountId");

  // Guard: read the post to get draftText and confirm it exists
  const [existing] = await db
    .select({ draftText: posts.draftText, status: posts.status })
    .from(posts)
    .where(eq(posts.id, postId))
    .limit(1);

  if (!existing) {
    return { success: false };
  }

  const draftText = existing.draftText ?? "";

  // 1. Update posts: mark as published with published_text
  await db
    .update(posts)
    .set({
      selectionState: "published",
      publishedText: publishedText.trim(),
      status: "published", // promote status to published
      publishedAt: new Date(),
    })
    .where(eq(posts.id, postId));

  // 2. Insert voice_corrections row
  const correctionId = crypto.randomUUID();
  await db.insert(voiceCorrections).values({
    id: correctionId,
    accountId,
    postId,
    draftText,
    publishedText: publishedText.trim(),
    createdAt: new Date(),
  });

  // 3. Fire-and-forget edit pattern extraction (Plan 04 implements extractEditPatterns)
  // Dynamic import so this plan is deployable before Plan 04 ships
  import("@/lib/edit-patterns")
    .then(({ extractEditPatterns }) =>
      extractEditPatterns(correctionId, draftText, publishedText.trim()).catch((err: unknown) =>
        logger.error("extractEditPatterns failed (non-fatal)", err, { correctionId })
      )
    )
    .catch(() => {
      // edit-patterns module not yet available — non-fatal, correction row still has value
    });

  // 4. Check corrections count — trigger re-synthesis if >= 5 and no recent synthesis
  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(voiceCorrections)
      .where(eq(voiceCorrections.accountId, accountId));

    const correctionCount = countResult[0]?.count ?? 0;

    if (correctionCount >= 5) {
      const [accountRow] = await db
        .select({ lastResynthAt: accounts.lastResynthAt })
        .from(accounts)
        .where(eq(accounts.id, accountId))
        .limit(1);

      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const lastResynth = accountRow?.lastResynthAt;
      const shouldResynth = !lastResynth || lastResynth < sevenDaysAgo;

      if (shouldResynth) {
        // Mark immediately to prevent concurrent triggers (Pitfall 6 guard)
        await db
          .update(accounts)
          .set({ lastResynthAt: new Date() })
          .where(eq(accounts.id, accountId));

        // Fire-and-forget re-synthesis (Plan 04 implements this)
        import("@/lib/edit-patterns")
          .then(({ resynthesizeVoiceAddendum }) =>
            resynthesizeVoiceAddendum(accountId).catch((err: unknown) =>
              logger.error("resynthesizeVoiceAddendum failed (non-fatal)", err, { accountId })
            )
          )
          .catch(() => {
            // Module not yet available — non-fatal
          });
      }
    }
  } catch (err) {
    // Re-synthesis check is non-fatal — correction insert already succeeded
    logger.error("Re-synthesis threshold check failed (non-fatal)", err, { accountId });
  }

  revalidatePath("/");
  return { success: true, correctionId };
}
