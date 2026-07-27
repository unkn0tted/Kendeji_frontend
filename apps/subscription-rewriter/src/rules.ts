import type { RewriteRule } from "./types";

export function ruleMatchesSubscriber(
  rule: RewriteRule,
  subscriberId: number
): boolean {
  if (!rule.enabled) {
    return false;
  }

  if (rule.match_mode === "ids") {
    return rule.subscriber_ids.includes(subscriberId);
  }

  return subscriberId >= rule.start_id && subscriberId <= rule.end_id;
}

export function compareMatchingRules(
  left: RewriteRule,
  right: RewriteRule
): number {
  const priorityDifference = right.priority - left.priority;
  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const leftIsExplicit = left.match_mode === "ids";
  const rightIsExplicit = right.match_mode === "ids";
  if (leftIsExplicit !== rightIsExplicit) {
    return leftIsExplicit ? -1 : 1;
  }

  return left.start_id - right.start_id || left.id.localeCompare(right.id);
}

export function moveRule(
  rules: RewriteRule[],
  sourceRuleId: string,
  targetRuleId: string
): RewriteRule[] {
  if (sourceRuleId === targetRuleId) {
    return rules;
  }

  const sourceIndex = rules.findIndex((rule) => rule.id === sourceRuleId);
  const targetIndex = rules.findIndex((rule) => rule.id === targetRuleId);
  if (sourceIndex < 0 || targetIndex < 0) {
    return rules;
  }

  const nextRules = [...rules];
  const [sourceRule] = nextRules.splice(sourceIndex, 1);
  if (!sourceRule) {
    return rules;
  }
  nextRules.splice(targetIndex, 0, sourceRule);
  return nextRules;
}
