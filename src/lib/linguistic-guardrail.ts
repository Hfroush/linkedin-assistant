import { createHash, randomUUID } from "crypto";
import { db } from "@/db/client";
import { openings } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PhraseRule {
  name: string;
  pattern: string;
  severity: number;
  explanation: string;
  suggestion: string;
}

export interface LinguisticIssue {
  ruleName: string;
  severity: number;
  matchedText: string;
  explanation: string;
  suggestion: string;
}

export interface LinguisticReview {
  approved: boolean;
  score: number;
  openingLine: string;
  openingFingerprint: string;
  issues: LinguisticIssue[];
  repairPrompt: string | null;
}

interface LinguisticPolicy {
  minScore: number;
  maxOpeningSimilarity: number;
  recentOpeningLimit: number;
  requireConcreteOpening: boolean;
}

// ---------------------------------------------------------------------------
// Policy
// ---------------------------------------------------------------------------

const DEFAULT_POLICY: LinguisticPolicy = {
  minScore: 82,
  maxOpeningSimilarity: 0.82,
  recentOpeningLimit: 200,
  requireConcreteOpening: true,
};

// ---------------------------------------------------------------------------
// Rules — ported from Python linguistic_guardrail.py
// ---------------------------------------------------------------------------

const DEFAULT_RULES: PhraseRule[] = [
  {
    name: "not_just_but",
    pattern:
      "(?:it'?s|this is|that is|the subject is|[a-z\\s]{1,40})\\s+not\\s+just\\s+(?:a|an|about|\\w+)[^.\\n]{0,90}\\s+(?:it'?s|but|rather)\\s+[^.\\n]{0,120}",
    severity: 35,
    explanation: "Uses the common contrastive GenAI structure 'not just X, but Y'.",
    suggestion:
      "Replace with a direct claim, a concrete observation, or a specific consequence.",
  },
  {
    name: "not_a_it_is_a",
    pattern:
      "(?:it|this|that|the \\w+)\\s+is\\s+not\\s+(?:a|an)\\s+[^.\\n]{1,80}\\s*[,;:\\-\\u2013\\u2014]?\\s*(?:it|this|that)?\\s*(?:is|'s)\\s+(?:a|an)\\s+[^.\\n]{1,120}",
    severity: 40,
    explanation: "Uses the fallback framing 'X is not a Y, it is a Z'.",
    suggestion: "State the stronger idea directly without the staged reversal.",
  },
  {
    name: "more_than_just",
    pattern: "(?:more than just|more than merely|not merely|not simply)\\b",
    severity: 25,
    explanation:
      "Uses a familiar inflation phrase that often signals generic positioning copy.",
    suggestion: "Name the precise function, mechanism, or change instead.",
  },
  {
    name: "unlock_the_power",
    pattern: "(?:unlock|unleash|harness)\\s+(?:the\\s+)?(?:power|potential|future)\\b",
    severity: 30,
    explanation:
      "Uses generic marketing language that appears frequently in AI-generated copy.",
    suggestion: "Replace with the specific user benefit or operational change.",
  },
  {
    name: "in_todays_world",
    pattern:
      "(?:in today'?s (?:world|landscape|digital age|fast-paced world)|now more than ever)\\b",
    severity: 30,
    explanation:
      "Uses a generic opening phrase instead of starting with the actual point.",
    suggestion: "Open with a specific tension, fact, user problem, or decision.",
  },
  {
    name: "game_changer",
    pattern:
      "(?:game[- ]changer|revolutionary|transformative|cutting[- ]edge|paradigm shift)\\b",
    severity: 30,
    explanation: "Uses broad hype language without earning it through detail.",
    suggestion: "Show what changes in practice and for whom.",
  },
  {
    name: "seamless_experience",
    pattern: "(?:seamless|frictionless|robust|scalable|innovative|user-friendly)\\b",
    severity: 15,
    explanation: "Uses a soft product adjective that needs evidence or replacement.",
    suggestion:
      "Replace with a concrete behaviour, interface feature, or measurable standard.",
  },
  {
    name: "delve_into",
    pattern: "(?:delve into|dive into|explore the world of|journey through)\\b",
    severity: 20,
    explanation: "Uses a generic content-introduction phrase.",
    suggestion: "Start with the actual claim or useful distinction.",
  },
  {
    name: "testament_to",
    pattern:
      "(?:stands as a testament to|serves as a reminder that|at its core|at the heart of)\\b",
    severity: 25,
    explanation: "Uses formulaic reflective phrasing often found in generated prose.",
    suggestion: "Use a plainer sentence with a specific subject and verb.",
  },
  {
    name: "lists_without_texture",
    pattern:
      "(?:efficiency, productivity, and|innovation, collaboration, and|clarity, confidence, and)\\b",
    severity: 15,
    explanation:
      "Uses a generic triple-list that may sound polished but vague.",
    suggestion:
      "Replace the abstract list with one concrete example or sharper category.",
  },
  {
    name: "two_sentence_negation_reversal",
    pattern:
      "\\b(?:it|this|that)\\s+(?:is|isn'?t|'s)\\s*not\\b[^.!?\\n]{5,150}[.!?][\\s\\n]+(?:it|this|that)\\s+(?:is|'s)\\b",
    severity: 40,
    explanation:
      "Uses the two-sentence negation-reversal structure: 'It's not X. It's Y.' — a hallmark of GenAI prose.",
    suggestion:
      "State the positive claim directly in a single sentence without the preceding negation.",
  },
  {
    name: "negative_parallelism",
    pattern:
      "\\bnot\\b[^.!?\\n]{3,80}[.!?][\\s\\n]+not\\b|\\bnot\\b[^,.!?\\n]{3,60},\\s*not\\b[^,.!?\\n]{3,60},",
    severity: 35,
    explanation:
      "Uses negative parallelism ('Not X. Not Y.' or 'Not X, not Y,') — a GenAI rhetorical habit that stacks negations instead of making a direct claim.",
    suggestion:
      "Cut the negations entirely. State what IS true in plain, positive terms.",
  },
  {
    name: "em_dash_overuse",
    pattern: "(?:—[^—\\n]*){2}—",
    severity: 25,
    explanation:
      "Uses three or more em dashes in close proximity — a common AI writing tic that fragments sentences artificially.",
    suggestion:
      "Limit em dashes to one per paragraph. Rewrite interrupted clauses as complete sentences.",
  },
  {
    name: "ai_vocabulary",
    pattern:
      "\\b(?:pivotal|showcase[sd]?|showcasing|underscore[sd]?|underscores|fostering|vibrant|tapestry|garner(?:ed|ing|s)?|intricate(?:ly)?|groundbreaking|renowned|breathtaking|profound(?:ly)?|encompassing|cultivating)\\b",
    severity: 15,
    explanation:
      "Uses high-frequency AI vocabulary words that signal generated prose (pivotal, showcase, underscores, fostering, vibrant, etc.).",
    suggestion:
      "Replace with specific, concrete language. Earn the meaning instead of asserting it.",
  },
  {
    name: "copula_avoidance",
    pattern:
      "\\b(?:serves? as an?|stands? as an?|functions? as an?|acts? as an?|operates? as an?)\\b",
    severity: 20,
    explanation:
      "Substitutes an elaborate construction for a plain 'is' or 'are' — a hallmark of AI prose.",
    suggestion: "Replace 'serves as a X' with 'is a X'.",
  },
  {
    name: "superficial_ing",
    pattern:
      "\\b(?:underscoring|highlighting|showcasing|symbolizing|reflecting|emphasizing|fostering|encompassing|cultivating)\\s+(?:the|its|their|how|that|an?|what)\\b",
    severity: 20,
    explanation:
      "Tacks a present-participle phrase onto a sentence to add fake analytical depth.",
    suggestion:
      "Cut the participle phrase. If the point matters, make it its own sentence with a real subject.",
  },
  {
    name: "persuasive_authority",
    pattern:
      "\\b(?:the real question is|what really matters is|fundamentally,|the deeper issue|the heart of the matter|in reality,|what it (?:really )?comes down to)\\b",
    severity: 20,
    explanation:
      "Uses fake-depth framing to restate an ordinary point with extra ceremony.",
    suggestion: "Cut the framing. State the point directly.",
  },
  {
    name: "generic_positive_conclusion",
    pattern:
      "\\b(?:the future (?:looks|is) bright|exciting times? (?:lie|lies|are) ahead|continues? (?:to thrive|their journey|its journey)|this represents? a (?:major|significant|key) step|the (?:journey|path) (?:forward|ahead))\\b",
    severity: 25,
    explanation:
      "Uses a vague upbeat ending that says nothing concrete.",
    suggestion:
      "End with the last specific thing that happened, or a concrete next action.",
  },
  {
    name: "filler_phrases",
    pattern:
      "\\b(?:in order to|due to the fact that|at this point in time|it is (?:important|worth(?:while)?) to note that|the fact of the matter is|needless to say|it goes without saying)\\b",
    severity: 15,
    explanation:
      "Uses a filler phrase that adds length without adding meaning.",
    suggestion: "Cut to: 'to', 'because', 'now', or remove the phrase entirely.",
  },
  {
    name: "vague_attribution",
    pattern:
      "\\b(?:(?:industry |some |many )?(?:experts?|observers?|analysts?|critics?) (?:argue|suggest|believe|note|say|claim)|(?:studies|research) (?:show|suggest|indicate) that)\\b",
    severity: 15,
    explanation:
      "Attributes a claim to unnamed experts or vague studies without a specific source.",
    suggestion: "Name the source, or rewrite as your own direct claim.",
  },
];

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

function normalizeSpace(text: string): string {
  return (text ?? "").replace(/\s+/g, " ").trim();
}

function extractOpeningLine(text: string): string {
  text = normalizeSpace(text);
  if (!text) return "";
  const match = text.match(/(.{20,220}?[.!?])(?:\s|$)/);
  if (match) return match[1].trim();
  return text.slice(0, 220).trim();
}

function fingerprintText(text: string): string {
  const normalized = normalizeSpace(text.toLowerCase().replace(/[^a-z0-9\s]/g, ""));
  return createHash("sha256").update(normalized).digest("hex").slice(0, 16);
}

function tokenSet(text: string): Set<string> {
  const words = text.toLowerCase().match(/[a-zA-Z0-9']+/g) ?? [];
  return new Set(words.filter((w) => w.length > 2));
}

function openingShape(text: string): string {
  return (text.toLowerCase().match(/[a-zA-Z0-9']+/g) ?? []).slice(0, 7).join(" ");
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (!a.size || !b.size) return 0;
  const intersection = [...a].filter((x) => b.has(x)).length;
  const union = new Set([...a, ...b]).size;
  return intersection / union;
}

function prefixSimilarity(a: string, b: string): number {
  const aWords = openingShape(a).split(" ");
  const bWords = openingShape(b).split(" ");
  if (!aWords.length || !bWords.length) return 0;
  let matches = 0;
  for (let i = 0; i < Math.min(aWords.length, bWords.length); i++) {
    if (aWords[i] === bWords[i]) matches++;
    else break;
  }
  return matches / Math.max(aWords.length, bWords.length);
}

function structuralSimilarity(a: string, b: string): number {
  return Math.max(
    jaccardSimilarity(tokenSet(a), tokenSet(b)),
    prefixSimilarity(a, b)
  );
}

function mostSimilar(candidate: string, previous: string[]): [string | null, number] {
  let bestText: string | null = null;
  let bestScore = 0;
  for (const item of previous) {
    const score = structuralSimilarity(candidate, item);
    if (score > bestScore) {
      bestScore = score;
      bestText = item;
    }
  }
  return [bestText, bestScore];
}

const ABSTRACT_OPENING_PATTERNS = [
  /^in\s+today'?s\b/i,
  /^when\s+it\s+comes\s+to\b/i,
  /^there\s+are\s+many\s+ways\b/i,
  /^one\s+of\s+the\s+most\s+important\b/i,
  /^the\s+future\s+of\b/i,
  /^as\s+we\s+move\s+into\b/i,
  /^in\s+an\s+era\s+of\b/i,
  /^at\s+its\s+core\b/i,
];

function isAbstractOpening(opening: string): boolean {
  return ABSTRACT_OPENING_PATTERNS.some((p) => p.test(opening));
}

// ---------------------------------------------------------------------------
// Opening memory (Neon-backed)
// ---------------------------------------------------------------------------

async function addOpening(openingText: string, contextKey: string | null): Promise<void> {
  const text = normalizeSpace(openingText);
  await db.insert(openings).values({
    id: randomUUID(),
    openingText: text,
    fingerprint: fingerprintText(text),
    contextKey,
    createdAt: new Date(),
  });
}

async function getRecentOpenings(contextKey: string | null, limit: number): Promise<string[]> {
  const rows = contextKey
    ? await db
        .select({ openingText: openings.openingText })
        .from(openings)
        .where(eq(openings.contextKey, contextKey))
        .orderBy(desc(openings.createdAt))
        .limit(limit)
    : await db
        .select({ openingText: openings.openingText })
        .from(openings)
        .orderBy(desc(openings.createdAt))
        .limit(limit);
  return rows.map((r) => r.openingText);
}

// ---------------------------------------------------------------------------
// Rule and opening issue detection
// ---------------------------------------------------------------------------

function getRuleIssues(text: string): LinguisticIssue[] {
  const issues: LinguisticIssue[] = [];
  for (const rule of DEFAULT_RULES) {
    const regex = new RegExp(rule.pattern, "gi");
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text)) !== null) {
      issues.push({
        ruleName: rule.name,
        severity: rule.severity,
        matchedText: normalizeSpace(match[0]),
        explanation: rule.explanation,
        suggestion: rule.suggestion,
      });
    }
  }
  return issues;
}

export function reviewTextAgainstRulesForTest(text: string): LinguisticIssue[] {
  return getRuleIssues(normalizeSpace(text));
}

async function getOpeningIssues(
  openingLine: string,
  contextKey: string | null,
  policy: LinguisticPolicy
): Promise<LinguisticIssue[]> {
  const issues: LinguisticIssue[] = [];

  if (!openingLine) {
    issues.push({
      ruleName: "missing_opening",
      severity: 45,
      matchedText: "",
      explanation: "No opening line was found.",
      suggestion: "Generate a clear first sentence.",
    });
    return issues;
  }

  if (policy.requireConcreteOpening && isAbstractOpening(openingLine)) {
    issues.push({
      ruleName: "abstract_opening",
      severity: 25,
      matchedText: openingLine,
      explanation:
        "The opening begins with abstract setup language rather than a concrete point.",
      suggestion:
        "Start with a specific user problem, decision, behaviour, or consequence.",
    });
  }

  const recentOpenings = await getRecentOpenings(contextKey, policy.recentOpeningLimit);
  const [closestOpening, similarity] = mostSimilar(openingLine, recentOpenings);

  if (closestOpening && similarity >= policy.maxOpeningSimilarity) {
    issues.push({
      ruleName: "repeated_opening_structure",
      severity: 45,
      matchedText: openingLine,
      explanation: `Opening too similar to a previous one (similarity: ${similarity.toFixed(2)}).`,
      suggestion: `Use a different sentence shape. Previous: "${closestOpening}"`,
    });
  }

  return issues;
}

function buildRepairPrompt(params: {
  originalText: string;
  openingLine: string;
  issues: LinguisticIssue[];
  recentOpenings: string[];
  contentGoal: string | null;
}): string {
  const { originalText, openingLine, issues, recentOpenings, contentGoal } = params;

  const issueLines = issues
    .map((i) => `- ${i.ruleName}: ${i.explanation} Suggestion: ${i.suggestion}`)
    .join("\n");

  const recentLines =
    recentOpenings.length > 0
      ? recentOpenings.slice(0, 25).map((l) => `- ${l}`).join("\n")
      : "No recent openings available.";

  const goal = contentGoal ?? "Preserve the meaning and improve the language.";

  return `Rewrite the text below so it passes a strict linguistic quality gate.

Goal:
${goal}

Opening line currently used:
${openingLine}

Problems to fix:
${issueLines}

Opening lines recently used — do not imitate their structure, rhythm, or first five words:
${recentLines}

Rules:
- Do not use 'not just X, but Y' or 'not merely X, but Y'.
- Do not use 'X is not a Y, it is a Z'.
- Do not use negative parallelism: 'Not X. Not Y.' or 'Not X, not Y,'.
- Do not use two-sentence negation reversals: 'It's not X. It's Y.'
- No em dash overuse — maximum one em dash per paragraph.
- Do not use generic phrases: 'in today's world', 'unlock the power', 'game-changer', 'seamless', 'transformative', 'groundbreaking', 'pivotal', 'vibrant'.
- Do not use AI vocabulary: 'showcase', 'underscores', 'fostering', 'tapestry', 'garner', 'intricate', 'renowned', 'profound', 'encompassing', 'cultivating'.
- Do not use copula avoidance: replace 'serves as a', 'stands as a', 'functions as a' with 'is'.
- Do not use tailing -ing phrases: 'underscoring that...', 'highlighting how...', 'showcasing the...', 'reflecting its...'.
- Do not use fake-depth framing: 'The real question is', 'What really matters is', 'At its core', 'The heart of the matter'.
- Do not use vague attributions: 'Experts argue', 'Studies suggest', 'Industry observers note'.
- Do not use filler: 'In order to', 'Due to the fact that', 'It is important to note that'.
- Do not use generic upbeat closings: 'The future looks bright', 'Exciting times lie ahead'.
- Start with a specific observation, action, tension, or consequence.
- Prefer concrete nouns and active verbs. Use 'is'/'are' directly.
- Keep the user's intended meaning intact.
- Do not add unsupported facts.
- Make the first sentence structurally different from the original opening.

Original text:
${originalText}`.trim();
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function reviewDraft(
  text: string,
  options: {
    contextKey?: string | null;
    contentGoal?: string | null;
    policy?: Partial<LinguisticPolicy>;
  } = {}
): Promise<LinguisticReview> {
  const policy = { ...DEFAULT_POLICY, ...options.policy };
  const contextKey = options.contextKey ?? null;

  const cleanText = normalizeSpace(text);
  const openingLine = extractOpeningLine(cleanText);
  const openingFingerprint = fingerprintText(openingLine);

  const ruleIssues = getRuleIssues(cleanText);
  const openingIssues = await getOpeningIssues(openingLine, contextKey, policy);
  const issues = [...ruleIssues, ...openingIssues];

  const score = Math.max(0, 100 - issues.reduce((sum, i) => sum + i.severity, 0));
  const hasCritical = issues.some((i) => i.severity >= 40);
  const approved = score >= policy.minScore && !hasCritical;

  let repairPrompt: string | null = null;
  if (!approved) {
    const recentOpenings = await getRecentOpenings(
      contextKey,
      Math.min(25, policy.recentOpeningLimit)
    );
    repairPrompt = buildRepairPrompt({
      originalText: cleanText,
      openingLine,
      issues,
      recentOpenings,
      contentGoal: options.contentGoal ?? null,
    });
  }

  return { approved, score, openingLine, openingFingerprint, issues, repairPrompt };
}

export async function recordApprovedDraft(
  text: string,
  contextKey: string | null = null
): Promise<void> {
  const opening = extractOpeningLine(normalizeSpace(text));
  if (opening) await addOpening(opening, contextKey);
}
