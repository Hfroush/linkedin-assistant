/**
 * Edit pattern extraction and voice re-synthesis stubs.
 *
 * STUB: This module is a placeholder for Plan 06-04 which implements the
 * Haiku-powered edit pattern extraction and voice addendum re-synthesis.
 *
 * These functions are called by logPublishedVersion (Plan 06-03) via
 * fire-and-forget dynamic import. They are non-blocking and non-fatal.
 *
 * Plan 04 will replace this file with the full implementation.
 */

/**
 * Analyses the diff between draftText and publishedText, extracts recurring
 * edit patterns, and stores the result in voice_corrections.edit_patterns.
 *
 * @param correctionId - UUID of the voice_corrections row to update
 * @param draftText - original AI-generated draft text
 * @param publishedText - text Houtan actually posted on LinkedIn
 */
export async function extractEditPatterns(
  correctionId: string,
  draftText: string,
  publishedText: string
): Promise<void> {
  // STUB — implemented in Plan 06-04
  void correctionId;
  void draftText;
  void publishedText;
}

/**
 * Synthesises a voice addendum from the last N voice_corrections rows for the
 * given account, and stores the result in accounts.voice_profile_addendum.
 *
 * @param accountId - DB account id (1=personal, 2=ucl, 3=startup)
 */
export async function resynthesizeVoiceAddendum(accountId: number): Promise<void> {
  // STUB — implemented in Plan 06-04
  void accountId;
}
