export function calculateEngagementRate(params: {
  reactions: number;
  comments: number;
  reposts: number;
  impressions: number;
}): number | null {
  const { reactions, comments, reposts, impressions } = params;

  if ([reactions, comments, reposts, impressions].some((value) => !Number.isFinite(value) || value < 0)) {
    throw new Error("Metrics must be finite non-negative numbers");
  }

  if (impressions === 0) return null;

  return (reactions + comments + reposts) / impressions;
}
