import { describe, expect, it } from "vitest";
import { calculateEngagementRate } from "./metrics";

describe("calculateEngagementRate", () => {
  it("calculates reactions plus comments plus reposts divided by impressions", () => {
    expect(calculateEngagementRate({ reactions: 10, comments: 5, reposts: 5, impressions: 100 })).toBe(0.2);
  });

  it("returns null for zero impressions", () => {
    expect(calculateEngagementRate({ reactions: 10, comments: 5, reposts: 5, impressions: 0 })).toBeNull();
  });

  it("rejects negative values", () => {
    expect(() => calculateEngagementRate({ reactions: -1, comments: 0, reposts: 0, impressions: 100 })).toThrow();
  });
});
