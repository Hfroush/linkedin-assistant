/**
 * Phase 1 Smoke Test — LinkedIn Assistant
 *
 * Verifies:
 * 1. Houtan Linkedin.docx is parseable by mammoth
 * 2. Voice profile is stored in Turso (voice_profile table, id=1)
 * 3. Voice profile is retrievable from DB
 * 4. Anthropic API call works with voice profile as cached system prompt
 * 5. Prompt caching is verified: cache_read_input_tokens > 0 on 2nd call
 *
 * Run: npm run seed
 * Expected output: LLM-generated draft post for Houtan to judge voice fidelity
 */

import { resolve } from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import { upsertVoiceProfile, getVoiceProfile } from "../src/lib/voice-profile";

// The test prompt (D-03: hardcoded, references founder psychology topic area)
const TEST_PROMPT =
  "Write a 2-sentence LinkedIn post about the interior life of building — " +
  "specifically the moment when a founder realizes they've been solving the " +
  "wrong problem for months.";

async function main() {
  console.log("\n=== Phase 1 Smoke Test ===\n");

  // Step 1: Parse and store voice profile
  const docxPath = resolve(process.cwd(), "Houtan Linkedin.docx");
  console.log(`Parsing DOCX: ${docxPath}`);

  await upsertVoiceProfile(docxPath);

  // Step 2: Retrieve voice profile
  const voiceProfileText = await getVoiceProfile();
  console.log(`✓ Voice profile retrieved from DB (${voiceProfileText.length} chars)\n`);

  // Step 3: Initialize Anthropic client
  // Seed script runs outside Next.js — env vars loaded via tsx --env-file=.env.local
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error(
      "ANTHROPIC_API_KEY not set. Ensure .env.local exists with a valid key."
    );
  }

  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  });

  // Build the system prompt array with cache_control on the voice profile block.
  // MUST be array form — string form does not support cache_control (AI-SPEC pitfall #1).
  const systemPrompt = [
    {
      type: "text" as const,
      text: voiceProfileText,
      cache_control: { type: "ephemeral" as const },
    },
    {
      type: "text" as const,
      text:
        "You are a LinkedIn content assistant for Houtan. " +
        "Draft posts in exactly the voice described above. " +
        "Stay within the 7 topic areas. " +
        "Do not use generic LinkedIn-speak ('As founders, we all know...', 'What do you think?'). " +
        "Be specific, analytical, and intellectually direct.",
    },
  ];

  // Call 1: expected to be a cache MISS (first call in this session)
  console.log("Making LLM call 1 (expected: cache miss)...");
  const response1 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: TEST_PROMPT }],
  });

  const usage1 = response1.usage;
  console.log(`  input_tokens: ${usage1.input_tokens}`);
  console.log(
    `  cache_creation_input_tokens: ${(usage1 as any).cache_creation_input_tokens ?? 0}`
  );
  console.log(
    `  cache_read_input_tokens: ${(usage1 as any).cache_read_input_tokens ?? 0}`
  );

  const cacheCreated = ((usage1 as any).cache_creation_input_tokens ?? 0) > 0;
  console.log(
    cacheCreated ? "  ✓ Cache entry created" : "  ⚠ No cache entry created (unexpected)"
  );

  // Call 2: expected to be a cache HIT (same system prompt, within 5-min TTL)
  console.log("\nMaking LLM call 2 (expected: cache HIT)...");
  const response2 = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 1024,
    system: systemPrompt,
    messages: [{ role: "user", content: TEST_PROMPT }],
  });

  const usage2 = response2.usage;
  console.log(`  input_tokens: ${usage2.input_tokens}`);
  console.log(
    `  cache_creation_input_tokens: ${(usage2 as any).cache_creation_input_tokens ?? 0}`
  );
  console.log(
    `  cache_read_input_tokens: ${(usage2 as any).cache_read_input_tokens ?? 0}`
  );

  const cacheHit = ((usage2 as any).cache_read_input_tokens ?? 0) > 0;

  if (cacheHit) {
    console.log("  ✓ CACHE HIT confirmed — prompt caching is working");
  } else {
    console.log(
      "  ⚠ Cache miss on 2nd call — this may happen if the voice profile is\n" +
        "    under ~1024 tokens (too short to cache efficiently) or if the 5-min\n" +
        "    TTL expired between calls. Check voice profile length above."
    );
  }

  // Print the draft from call 1 for manual voice fidelity judgment (D-02)
  const draftContent = response1.content[0];
  if (draftContent.type !== "text") {
    throw new Error("Unexpected response type: " + draftContent.type);
  }

  console.log("\n=== DRAFT OUTPUT (judge voice fidelity) ===\n");
  console.log(draftContent.text);
  console.log("\n=== END DRAFT ===\n");

  console.log("Phase 1 smoke test complete.");
  console.log(
    "Voice fidelity check: Does the draft above sound like Houtan? " +
      "Is it specific, analytical, and non-generic? " +
      "(Score 1-5 mentally — if ≤3, the voice profile may need review)\n"
  );
}

main().catch((err) => {
  console.error("\nSmoke test FAILED:", err.message);
  process.exit(1);
});
