import { eq, isNull } from "drizzle-orm";
import { db } from "@/db/client";
import { accounts, voiceProfile, posts } from "@/db/schema";

async function seedAccounts() {
  console.log("Seeding accounts...");

  // 1. Insert 3 account rows — onConflictDoNothing makes this idempotent
  await db
    .insert(accounts)
    .values([
      {
        id: 1,
        slug: "personal",
        displayName: "Houtan Personal",
        voiceDocxPath: "Houtan Linkedin.docx",
      },
      {
        id: 2,
        slug: "ucl",
        displayName: "UCL EdTech Labs",
        voiceDocxPath: null, // DOCX for UCL not yet provided — falls back to personal profile
      },
      {
        id: 3,
        slug: "startup",
        displayName: "Startup Labs",
        voiceDocxPath: null, // DOCX for Startup not yet provided — falls back to personal profile
      },
    ])
    .onConflictDoNothing();

  console.log("✓ 3 accounts seeded (personal=1, ucl=2, startup=3)");

  // 2. Back-fill existing voice_profile singleton row (id=1) → account_id=1
  await db
    .update(voiceProfile)
    .set({ accountId: 1 })
    .where(eq(voiceProfile.id, 1));

  console.log("✓ voice_profile row id=1 back-filled to account_id=1");

  // 3. Back-fill all posts with no account_id → personal account (id=1)
  await db
    .update(posts)
    .set({ accountId: 1 })
    .where(isNull(posts.accountId));

  console.log("✓ Existing posts back-filled to account_id=1");

  console.log("Seed complete.");
  process.exit(0);
}

seedAccounts().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
