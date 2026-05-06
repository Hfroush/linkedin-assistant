import { describe, expect, it } from "vitest";
import { reviewTextAgainstRulesForTest } from "./linguistic-guardrail";

function ruleNames(text: string): string[] {
  return reviewTextAgainstRulesForTest(text).map((issue) => issue.ruleName);
}

describe("linguistic guardrail phrase rules", () => {
  it("flags not just but framing", () => {
    expect(ruleNames("This is not just a tool, but a system for changing behaviour.")).toContain("not_just_but");
  });

  it("flags X is not a Y, it is a Z framing", () => {
    expect(ruleNames("This is not a grade, it is a signal that shows whether behaviour is changing.")).toContain("not_a_it_is_a");
  });

  it("flags two-sentence negation reversal", () => {
    expect(ruleNames("This is not a grade. It is a signal that shows whether behaviour is changing.")).toContain("two_sentence_negation_reversal");
  });

  it("flags generic GenAI openings", () => {
    expect(ruleNames("In today's fast-paced world, founders need better tools.")).toContain("in_todays_world");
  });

  it("does not flag a concrete direct opening", () => {
    expect(ruleNames("Most founders do not need more dashboards. They need one sharper decision a week.")).toEqual([]);
  });
});
