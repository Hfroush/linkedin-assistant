import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — check happens at first call, not at module evaluation.
// Required because Next.js compiles Server Action modules in an (action-browser)
// context that strips non-NEXT_PUBLIC_ vars from process.env at module load time,
// even though the action itself runs server-side where the var is available.
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is not set. " +
          "Copy .env.local.example to .env.local and fill in the value."
      );
    }
    _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return _client;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop: string | symbol) {
    return (getClient() as any)[prop];
  },
});
