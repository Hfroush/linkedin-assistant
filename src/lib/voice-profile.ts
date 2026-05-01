import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import mammoth from "mammoth";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { voiceProfile } from "@/db/schema";

/**
 * Parse `Houtan Linkedin.docx` and upsert the voice profile row in the DB.
 *
 * Computes a sha256 checksum of the raw file bytes — skips re-parsing if unchanged.
 * Always writes to the singleton row (id=1).
 */
export async function upsertVoiceProfile(docxPath: string): Promise<void> {
  const absolutePath = resolve(docxPath);
  const rawBytes = await readFile(absolutePath);
  const checksum = createHash("sha256").update(rawBytes).digest("hex");

  const existing = await db
    .select({ docxChecksum: voiceProfile.docxChecksum })
    .from(voiceProfile)
    .where(eq(voiceProfile.id, 1))
    .get();

  if (existing?.docxChecksum === checksum) {
    console.log("Voice profile unchanged (checksum match) — skipping re-parse.");
    return;
  }

  const result = await mammoth.extractRawText({ buffer: rawBytes });

  if (result.messages.length > 0) {
    console.warn("mammoth parse warnings:", result.messages);
  }

  const rawText = result.value.trim();

  if (!rawText || rawText.length < 100) {
    throw new Error(
      `Voice profile parse produced suspiciously short text (${rawText.length} chars). ` +
        "Check that the DOCX contains readable content and is not corrupted."
    );
  }

  await db
    .insert(voiceProfile)
    .values({
      id: 1,
      rawText,
      parsedAt: new Date(),
      docxChecksum: checksum,
    })
    .onConflictDoUpdate({
      target: voiceProfile.id,
      set: {
        rawText,
        parsedAt: new Date(),
        docxChecksum: checksum,
      },
    });

  console.log(
    `✓ Voice profile stored (${rawText.length} chars, checksum: ${checksum.slice(0, 8)}...)`
  );
}

/**
 * Retrieve the stored voice profile text from the database.
 *
 * Used by every LLM call as the first cached system prompt block.
 * Throws if the profile has not been stored yet — run `npm run seed` first.
 */
export async function getVoiceProfile(): Promise<string> {
  const row = await db
    .select({ rawText: voiceProfile.rawText })
    .from(voiceProfile)
    .where(eq(voiceProfile.id, 1))
    .get();

  if (!row) {
    throw new Error(
      "Voice profile not found in database. " +
        "Run `npm run seed` to parse Houtan Linkedin.docx and store the voice profile."
    );
  }

  return row.rawText;
}
