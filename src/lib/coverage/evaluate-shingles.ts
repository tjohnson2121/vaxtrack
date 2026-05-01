import type { ConditionId, CoverageInput, CoverageResult, NaciVsHcGap } from "./types";
import { SOURCES } from "./sources";
import { noEncodedProvincialProgramResult } from "./no-encoded-result";

const NACI_SHINGLES_NOTE =
  "NACI strongly recommends (Grade A, 2025 update) Shingrix for all immunocompetent adults 50 years and older (2-dose series). NACI also strongly recommends (Grade A) Shingrix for immunocompromised adults 18 years and older.";

const HC_VS_NACI_GAP_50PLUS: NaciVsHcGap = {
  hcIndication: "Adults 50+ (2-dose series)",
  naciGrade: "Grade A · Adults 50+",
  alignment: "full",
};

const HC_VS_NACI_GAP_IMMUNOCOMPROMISED: NaciVsHcGap = {
  hcIndication: "Immunocompromised adults 18+ (2-dose series)",
  naciGrade: "Grade A · Immunocompromised adults 18+ (2025)",
  alignment: "full",
};

function has(c: ConditionId[], id: ConditionId) {
  return c.includes(id);
}

function shinglesResult(
  partial: Omit<CoverageResult, "primarySourceUrl"> & { primarySourceUrl?: string }
): CoverageResult {
  return {
    primarySourceUrl: partial.primarySourceUrl ?? SOURCES.hcShingrix,
    outcome: partial.outcome,
    confidence: partial.confidence,
    rationale: partial.rationale,
    supportingSourceUrls: partial.supportingSourceUrls,
    dispensingContext: partial.dispensingContext,
    missingInformation: partial.missingInformation,
    declineReason: partial.declineReason,
    naciNote: partial.naciNote ?? NACI_SHINGLES_NOTE,
    coverageGap: partial.coverageGap,
    naciVsHcGap: partial.naciVsHcGap,
    publicProgramPayerNote: partial.publicProgramPayerNote,
  };
}

/** Shared: patient is outside any known provincial age threshold */
function notFundedResult(
  jurisdictionName: string,
  sourceUrl: string,
  ageYears: number,
  fundedAgeThreshold: number,
  naciVsHcGap: NaciVsHcGap,
  considerNaci?: boolean,
): CoverageResult {
  return shinglesResult({
    outcome: "not_covered",
    confidence: "medium",
    rationale: [
      `${jurisdictionName}'s publicly funded Shingrix program covers adults ${fundedAgeThreshold}+. Patient is ${ageYears} years old and does not meet the age threshold.`,
    ],
    primarySourceUrl: sourceUrl,
    supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
    declineReason: `Age not met — ${jurisdictionName} public program requires ${fundedAgeThreshold}+`,
    coverageGap: `Adults 50–${fundedAgeThreshold - 1} are HC-approved and NACI Grade A for Shingrix, but ${jurisdictionName} doesn't publicly fund this age group.`,
    naciVsHcGap,
  });
}

/** Shared: under 50, not immunocompromised */
function under50NotEligible(sourceUrl: string): CoverageResult {
  return shinglesResult({
    outcome: "not_covered",
    confidence: "high",
    rationale: [
      "Health Canada approved Shingrix for adults 50 years and older (immunocompetent). NACI's Grade A recommendation also begins at age 50 for immunocompetent adults.",
    ],
    primarySourceUrl: sourceUrl,
    supportingSourceUrls: [SOURCES.naciShingles],
    declineReason: "Under 50 without immunocompromising condition — outside HC indication and NACI Grade A for immunocompetent adults",
    naciVsHcGap: {
      hcIndication: "Adults 50+ (2-dose series)",
      naciGrade: "Grade A · Adults 50+",
      alignment: "gap",
      gapDetail: "Under 50 without immunocompromise — outside both HC indication and NACI Grade A",
    },
  });
}

// ─── Ontario ─────────────────────────────────────────────────────────────────

function evaluateOntarioShingles(input: CoverageInput): CoverageResult {
  const { ageYears, conditionIds, considerNaci } = input;

  if (ageYears < 50 && !has(conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(SOURCES.onShingles);
  }
  if (has(conditionIds, "immunocompromised_shingles") && ageYears >= 18 && ageYears < 65) {
    return shinglesResult({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Ontario's Shingrix program primarily funds adults 65+. For immunocompromised adults under 65, verify current Ontario eligibility — NACI strongly recommends (Grade A) Shingrix for immunocompromised adults 18+.",
      ],
      primarySourceUrl: SOURCES.onShingles,
      supportingSourceUrls: [SOURCES.naciShingles],
      missingInformation: ["Confirm Ontario currently funds Shingrix for immunocompromised adults under 65"],
      naciVsHcGap: HC_VS_NACI_GAP_IMMUNOCOMPROMISED,
      coverageGap: "HC and NACI Grade A support Shingrix for immunocompromised adults 18+, but Ontario may not publicly fund adults under 65 in this group.",
    });
  }
  if (ageYears >= 65) {
    return shinglesResult({
      outcome: "covered",
      confidence: "high",
      rationale: [
        "Ontario publicly funds Shingrix (2-dose series) for adults 65 years and older.",
      ],
      primarySourceUrl: SOURCES.onShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  // 50–64, immunocompetent
  return notFundedResult("Ontario", SOURCES.onShingles, ageYears, 65, HC_VS_NACI_GAP_50PLUS, considerNaci);
}

// ─── Quebec ──────────────────────────────────────────────────────────────────

function evaluateQuebecShingles(input: CoverageInput): CoverageResult {
  const { ageYears, conditionIds, considerNaci } = input;

  if (ageYears < 50 && !has(conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(SOURCES.qcShingles);
  }
  if (ageYears >= 70) {
    return shinglesResult({
      outcome: "covered",
      confidence: "high",
      rationale: [
        "Québec MSSS funds Shingrix for adults 70 years and older.",
      ],
      primarySourceUrl: SOURCES.qcShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  return notFundedResult("Quebec", SOURCES.qcShingles, ageYears, 70, HC_VS_NACI_GAP_50PLUS, considerNaci);
}

// ─── Nova Scotia ─────────────────────────────────────────────────────────────

function evaluateNovaScotiaShingles(input: CoverageInput): CoverageResult {
  const { ageYears, conditionIds, considerNaci } = input;

  if (ageYears < 50 && !has(conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(SOURCES.nsShingles);
  }
  if (ageYears >= 65) {
    return shinglesResult({
      outcome: "covered",
      confidence: "medium",
      rationale: [
        "Nova Scotia provides Shingrix for adults 65 years and older — verify current CDPD program criteria at the linked source.",
      ],
      primarySourceUrl: SOURCES.nsShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  return notFundedResult("Nova Scotia", SOURCES.nsShingles, ageYears, 65, HC_VS_NACI_GAP_50PLUS, considerNaci);
}

// ─── Alberta ─────────────────────────────────────────────────────────────────

function evaluateAlbertaShingles(input: CoverageInput): CoverageResult {
  const { ageYears, conditionIds, considerNaci } = input;

  if (ageYears < 50 && !has(conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(SOURCES.abShingles);
  }
  if (ageYears >= 65) {
    return shinglesResult({
      outcome: "covered",
      confidence: "medium",
      rationale: [
        "Alberta Health Services lists Shingrix for adults 65 years and older — confirm current Alberta immunization schedule at the linked source.",
      ],
      primarySourceUrl: SOURCES.abShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  return notFundedResult("Alberta", SOURCES.abShingles, ageYears, 65, HC_VS_NACI_GAP_50PLUS, considerNaci);
}

// ─── British Columbia ─────────────────────────────────────────────────────────

function evaluateBCShingles(input: CoverageInput): CoverageResult {
  const { ageYears, conditionIds, considerNaci } = input;

  if (ageYears < 50 && !has(conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(SOURCES.bcShingles);
  }
  if (ageYears >= 70) {
    return shinglesResult({
      outcome: "covered",
      confidence: "medium",
      rationale: [
        "BC HealthLinkBC notes Shingrix funding for adults 70 years and older — confirm current BCCDC program criteria.",
      ],
      primarySourceUrl: SOURCES.bcShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  return notFundedResult("British Columbia", SOURCES.bcShingles, ageYears, 70, HC_VS_NACI_GAP_50PLUS, considerNaci);
}

// ─── Manitoba ─────────────────────────────────────────────────────────────────

function evaluateManitobaShingles(input: CoverageInput): CoverageResult {
  const { ageYears, conditionIds, considerNaci } = input;

  if (ageYears < 50 && !has(conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(SOURCES.mbShingles);
  }
  if (has(conditionIds, "immunocompromised_shingles") && ageYears >= 18) {
    return shinglesResult({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Manitoba may fund Shingrix for immunocompromised adults — verify current eligibility criteria at the Manitoba Health shingles page.",
      ],
      primarySourceUrl: SOURCES.mbShingles,
      supportingSourceUrls: [SOURCES.naciShingles],
      missingInformation: ["Confirm Manitoba currently funds Shingrix for this immunocompromised patient"],
      naciVsHcGap: HC_VS_NACI_GAP_IMMUNOCOMPROMISED,
    });
  }
  if (ageYears >= 65) {
    return shinglesResult({
      outcome: "covered",
      confidence: "medium",
      rationale: [
        "Manitoba funds Shingrix for adults 65 years and older — confirm current program details at the linked source.",
      ],
      primarySourceUrl: SOURCES.mbShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  return notFundedResult("Manitoba", SOURCES.mbShingles, ageYears, 65, HC_VS_NACI_GAP_50PLUS, considerNaci);
}

// ─── Newfoundland & Labrador ──────────────────────────────────────────────────

function evaluateNLShingles(input: CoverageInput): CoverageResult {
  const { ageYears, considerNaci } = input;

  if (ageYears < 50) return under50NotEligible(SOURCES.nlShingles);
  return shinglesResult({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      "Newfoundland & Labrador expanded its immunization programs in 2025 — verify current Shingrix eligibility at the provincial health release linked.",
    ],
    primarySourceUrl: SOURCES.nlShingles,
    supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
    missingInformation: ["Confirm current NL Shingrix program eligibility and age threshold"],
    naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    coverageGap: "Adults 50+ are HC-approved and NACI Grade A for Shingrix; NL program details require verification.",
  });
}

// ─── PEI ─────────────────────────────────────────────────────────────────────

function evaluatePEIShingles(input: CoverageInput): CoverageResult {
  const { ageYears } = input;

  if (ageYears < 50) return under50NotEligible(SOURCES.peShingles);
  return shinglesResult({
    outcome: "covered",
    confidence: "high",
    rationale: [
      "PEI expanded its free Shingrix program to include Islanders 50 years and older.",
    ],
    primarySourceUrl: SOURCES.peShingles,
    supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
    naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
  });
}

// ─── Saskatchewan ─────────────────────────────────────────────────────────────

function evaluateSKShingles(input: CoverageInput): CoverageResult {
  const { ageYears, considerNaci } = input;

  if (ageYears < 50) return under50NotEligible(SOURCES.skShingles);
  if (ageYears >= 65) {
    return shinglesResult({
      outcome: "conditional",
      confidence: "low",
      rationale: [
        "Saskatchewan Shingrix program details should be confirmed at the provincial source — full eligibility criteria for the current season require verification.",
      ],
      primarySourceUrl: SOURCES.skShingles,
      supportingSourceUrls: [SOURCES.hcShingrix, SOURCES.naciShingles],
      missingInformation: ["Confirm current Saskatchewan Shingrix program eligibility"],
      naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    });
  }
  return shinglesResult({
    outcome: "not_covered",
    confidence: "low",
    rationale: ["Saskatchewan Shingrix details require verification; patient may be outside the typical public program age band."],
    primarySourceUrl: SOURCES.skShingles,
    missingInformation: ["Verify Saskatchewan Shingrix program at the linked source"],
    naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
    coverageGap: "Adults 50–64 are HC-approved and NACI Grade A for Shingrix; SK public funding requires verification.",
  });
}

// ─── Territories ─────────────────────────────────────────────────────────────

function evaluateTerritoryShingles(
  name: string,
  sourceUrl: string | null,
  input: CoverageInput,
): CoverageResult {
  if (input.ageYears < 50 && !has(input.conditionIds, "immunocompromised_shingles")) {
    return under50NotEligible(sourceUrl ?? SOURCES.hcShingrix);
  }
  return shinglesResult({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      `${name}'s Shingrix program details are limited — verify current eligibility with the territorial health authority.`,
    ],
    primarySourceUrl: sourceUrl ?? SOURCES.hcShingrix,
    supportingSourceUrls: [SOURCES.naciShingles, SOURCES.cigShingles],
    missingInformation: [`Confirm ${name} Shingrix eligibility with the territorial health authority`],
    naciVsHcGap: HC_VS_NACI_GAP_50PLUS,
  });
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function evaluateShingles(input: CoverageInput): CoverageResult {
  switch (input.jurisdiction) {
    case "NB":
      return noEncodedProvincialProgramResult({
        jurisdictionDisplayName: "New Brunswick",
        productLabel: "Shingrix",
        primarySourceUrl: SOURCES.nbShingles,
      });
    case "NT":
      return noEncodedProvincialProgramResult({
        jurisdictionDisplayName: "Northwest Territories",
        productLabel: "Shingrix",
        primarySourceUrl: SOURCES.cigShingles,
      });
    case "NU":
      return noEncodedProvincialProgramResult({
        jurisdictionDisplayName: "Nunavut",
        productLabel: "Shingrix",
        primarySourceUrl: SOURCES.cigShingles,
      });
    case "ON": return evaluateOntarioShingles(input);
    case "QC": return evaluateQuebecShingles(input);
    case "NS": return evaluateNovaScotiaShingles(input);
    case "AB": return evaluateAlbertaShingles(input);
    case "BC": return evaluateBCShingles(input);
    case "MB": return evaluateManitobaShingles(input);
    case "NL": return evaluateNLShingles(input);
    case "PE": return evaluatePEIShingles(input);
    case "SK": return evaluateSKShingles(input);
    case "YT": return evaluateTerritoryShingles("Yukon", SOURCES.ytShingles, input);
  }
}
