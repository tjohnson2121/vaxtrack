import type { ConditionId, CoverageInput, CoverageResult } from "@/lib/coverage/types";
import type { CoverageRuleParsed } from "./schema";

function matchesWhen(
  input: CoverageInput,
  when: CoverageRuleParsed["when"]
): boolean {
  if (!when || Object.keys(when).length === 0) return true;

  if (
    when.minAgeYears !== undefined &&
    input.ageYears < when.minAgeYears
  ) {
    return false;
  }
  if (
    when.maxAgeYears !== undefined &&
    input.ageYears > when.maxAgeYears
  ) {
    return false;
  }
  if (when.minAgeMonths !== undefined) {
    if (
      input.ageMonths === undefined ||
      input.ageMonths < when.minAgeMonths
    ) {
      return false;
    }
  }
  if (when.maxAgeMonths !== undefined) {
    if (
      input.ageMonths === undefined ||
      input.ageMonths > when.maxAgeMonths
    ) {
      return false;
    }
  }
  if (
    when.pregnant !== undefined &&
    Boolean(input.pregnant) !== when.pregnant
  ) {
    return false;
  }
  if (when.gestationalWeeksMin !== undefined) {
    if (
      input.gestationalWeeks === undefined ||
      input.gestationalWeeks < when.gestationalWeeksMin
    ) {
      return false;
    }
  }
  if (when.gestationalWeeksMax !== undefined) {
    if (
      input.gestationalWeeks === undefined ||
      input.gestationalWeeks > when.gestationalWeeksMax
    ) {
      return false;
    }
  }
  if (
    when.deliverDuringRsvSeason !== undefined &&
    Boolean(input.deliverDuringRsvSeason) !== when.deliverDuringRsvSeason
  ) {
    return false;
  }
  if (
    when.previouslyReceivedPublicAdultRsv !== undefined &&
    Boolean(input.previouslyReceivedPublicAdultRsv) !==
      when.previouslyReceivedPublicAdultRsv
  ) {
    return false;
  }
  if (
    when.pediatricSpecialistDiscussed !== undefined &&
    Boolean(input.pediatricSpecialistDiscussed) !==
      when.pediatricSpecialistDiscussed
  ) {
    return false;
  }

  const conds = input.conditionIds as ConditionId[];
  if (when.anyConditions && when.anyConditions.length > 0) {
    if (!when.anyConditions.some((c) => conds.includes(c))) {
      return false;
    }
  }
  if (when.allConditions && when.allConditions.length > 0) {
    if (!when.allConditions.every((c) => conds.includes(c))) {
      return false;
    }
  }

  return true;
}

export function evaluateWithPublishedRules(
  input: CoverageInput,
  rules: CoverageRuleParsed[]
): CoverageResult | null {
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);

  for (const rule of sorted) {
    if (rule.jurisdiction !== input.jurisdiction) continue;
    if (!rule.products.includes(input.product)) continue;
    if (!matchesWhen(input, rule.when)) continue;

    return {
      outcome: rule.outcome,
      confidence: rule.confidence,
      rationale: rule.rationale,
      primarySourceUrl: rule.primarySourceUrl,
      supportingSourceUrls: rule.supportingSourceUrls,
      dispensingContext: rule.dispensingContext,
      missingInformation: rule.missingInformation,
    };
  }

  return null;
}
