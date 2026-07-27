import { describe, expect, test } from "bun:test";
import { moveRule } from "./rules";
import type { RewriteRule } from "./types";

function createRule(id: string): RewriteRule {
  return {
    id,
    name: id,
    match_mode: "range",
    start_id: 1,
    end_id: 100,
    subscriber_ids: [],
    source_host: "old.example.com",
    target_host: `${id}.example.com`,
    enabled: true,
    priority: 100,
  };
}

describe("moveRule", () => {
  const rules = [createRule("a"), createRule("b"), createRule("c")];

  test("moves a rule to the target rule position", () => {
    expect(moveRule(rules, "a", "c").map((rule) => rule.id)).toEqual([
      "b",
      "c",
      "a",
    ]);
    expect(moveRule(rules, "c", "a").map((rule) => rule.id)).toEqual([
      "c",
      "a",
      "b",
    ]);
  });

  test("keeps the current order when either rule is no longer present", () => {
    expect(moveRule(rules, "future-rule", "b")).toBe(rules);
    expect(moveRule(rules, "a", "future-rule")).toBe(rules);
  });
});
