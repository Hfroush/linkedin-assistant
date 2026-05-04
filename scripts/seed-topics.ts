/**
 * Topic Area Seed Script — LinkedIn Assistant
 *
 * Seeds Houtan's 7 topic areas into the topic_areas table.
 * Idempotent: safe to run multiple times — skips existing rows.
 *
 * Run: npm run seed-topics
 */

import { db } from "../src/db/client";
import { topicAreas } from "../src/db/schema";

const TOPIC_AREAS = [
  {
    id: 1,
    name: "Founder psychology",
    description:
      "The interior life of building — loneliness, constitutional calm, the weight of uncertainty that has nowhere to land",
    keywords:
      '["founder", "psychology", "building", "uncertainty", "loneliness", "interior life"]',
  },
  {
    id: 2,
    name: "Education as a design problem",
    description:
      "Impact validation vs. market traction — why educators struggle to prove what works",
    keywords:
      '["education", "design", "impact", "validation", "market traction", "learning"]',
  },
  {
    id: 3,
    name: "The archaeology of institutions",
    description:
      "What institutions actually are — their embedded logic, how they resist change, what they protect",
    keywords:
      '["institutions", "archaeology", "change", "embedded logic", "systems"]',
  },
  {
    id: 4,
    name: "What AI actually changes in education",
    description:
      "Evidence-based, not hype — replacement, complementarity, augmentation (Cukurova framework)",
    keywords:
      '["AI", "education", "evidence", "Cukurova", "replacement", "augmentation", "complementarity"]',
  },
  {
    id: 5,
    name: "The founder-as-translator",
    description:
      "Converting uncertainty into direction — the cognitive work of making decisions with incomplete information",
    keywords:
      '["founder", "translator", "uncertainty", "direction", "decision-making", "communication"]',
  },
  {
    id: 6,
    name: "Scale and intimacy",
    description:
      "Why small rooms beat big stages — the mechanics of trust and connection at different scales",
    keywords:
      '["scale", "intimacy", "small rooms", "trust", "connection", "community"]',
  },
  {
    id: 7,
    name: "The gap between proof and belief",
    description:
      "Conviction, professional judgment, and policy as the same cognitive move across domains",
    keywords:
      '["proof", "belief", "conviction", "judgment", "policy", "evidence", "cognition"]',
  },
];

async function main() {
  await db.insert(topicAreas).values(TOPIC_AREAS).onConflictDoNothing();
  console.log("✓ Topic areas seeded (7 rows, idempotent)");
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
