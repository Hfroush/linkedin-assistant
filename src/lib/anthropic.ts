import Anthropic from "@anthropic-ai/sdk";

// Lazy singleton — check at first call, not module evaluation.
// Bracket notation defeats webpack DefinePlugin's static replacement of
// process.env.VAR with undefined in the (action-browser) compilation context.
let _client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!_client) {
    const key = process.env["ANTHROPIC_API_KEY"];
    if (!key) {
      throw new Error(
        "ANTHROPIC_API_KEY environment variable is not set. " +
          "Copy .env.local.example to .env.local and fill in the value."
      );
    }
    _client = new Anthropic({ apiKey: key });
  }
  return _client;
}

export const anthropic = new Proxy({} as Anthropic, {
  get(_, prop: string | symbol) {
    return (getClient() as any)[prop];
  },
});
