import type { ConditionId, CoverageInput, CoverageResult } from "./types";
import { SOURCES } from "./sources";

const ON_PHARMACY_CONTEXT =
  "Ontario's MOH states that free RSV immunizations are not available through pharmacies for older adults, infants and high-risk children, and pregnant individuals; publicly funded supply is ordered via public health / OGPMSS. Patients using pharmacy may pay out of pocket with a prescription.";

function has(c: ConditionId[], id: ConditionId) {
  return c.includes(id);
}

function result(
  partial: Omit<CoverageResult, "primarySourceUrl"> & {
    primarySourceUrl?: string;
  }
): CoverageResult {
  return {
    primarySourceUrl: partial.primarySourceUrl ?? SOURCES.onPrograms,
    outcome: partial.outcome,
    confidence: partial.confidence,
    rationale: partial.rationale,
    supportingSourceUrls: partial.supportingSourceUrls,
    dispensingContext: partial.dispensingContext,
    missingInformation: partial.missingInformation,
    declineReason: partial.declineReason,
    naciNote: partial.naciNote,
    coverageGap: partial.coverageGap,
  };
}

function ontarioAdultRiskMet(c: ConditionId[]) {
  return (
    has(c, "lct_retirement_resident") ||
    has(c, "alc_hospital") ||
    has(c, "gn_immunocompromised") ||
    has(c, "dialysis") ||
    has(c, "transplant") ||
    has(c, "homeless") ||
    has(c, "indigenous")
  );
}

function evaluateOntario(input: CoverageInput): CoverageResult {
  const {
    product,
    ageYears,
    ageMonths,
    pregnant,
    gestationalWeeks,
    deliverDuringRsvSeason,
    previouslyReceivedPublicAdultRsv,
    pediatricSpecialistDiscussed,
    conditionIds,
  } = input;

  if (product === "Beyfortus") {
    if (ageMonths === undefined || Number.isNaN(ageMonths)) {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Beyfortus eligibility in Ontario depends on infant age under 24 months and specific high-risk criteria with pediatric specialist involvement.",
        ],
        missingInformation: ["Infant age in months"],
        primarySourceUrl: SOURCES.onPrograms,
        supportingSourceUrls: [SOURCES.hcBeyfortus],
      });
    }
    if (ageMonths >= 24) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Ontario's infant RSV program describes Beyfortus for eligible infants under 24 months meeting program criteria—not at or above 24 months.",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        declineReason: "Age not met — program requires infant under 24 months",
      });
    }
    if (has(conditionIds, "chronic_lung_prematurity")) {
      if (!pediatricSpecialistDiscussed) {
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Ontario lists Beyfortus for eligible high-risk children under 24 months following discussion with a pediatrician or pediatric specialist.",
          ],
          missingInformation: [
            "Confirm discussion with pediatrician / pediatric specialist per program requirements",
          ],
          primarySourceUrl: SOURCES.onPrograms,
        });
      }
      return result({
        outcome: "covered",
        confidence: "medium",
        rationale: [
          "Based on infant under 24 months with chronic lung disease of prematurity / BPD-type criteria and documented specialist discussion—confirm documentation per MOH guidance.",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        dispensingContext: ON_PHARMACY_CONTEXT,
        naciNote:
          "NACI strongly recommends nirsevimab (Beyfortus) for all infants entering their first RSV season and for high-risk children in the second season (Grade A).",
      });
    }
    return result({
      outcome: "conditional",
      confidence: "low",
      rationale: [
        "Ontario funds Beyfortus only for infants meeting listed high-risk criteria (e.g., CLD/BPD pathway). No matching high-risk criterion was selected.",
      ],
      missingInformation: [
        "Confirm infant meets an Ontario-listed high-risk criterion",
      ],
      primarySourceUrl: SOURCES.onPrograms,
    });
  }

  if (product === "Abrysvo" && pregnant) {
    if (gestationalWeeks === undefined) {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Ontario funds Abrysvo in pregnancy for those at 32–36 weeks gestation who will deliver during RSV season.",
        ],
        missingInformation: ["Gestational age (weeks)"],
        primarySourceUrl: SOURCES.onPrograms,
        supportingSourceUrls: [SOURCES.hcAbrysvo],
      });
    }
    if (gestationalWeeks < 32 || gestationalWeeks > 36) {
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "Ontario specifies Abrysvo for pregnant individuals between 32 and 36 weeks gestation (seasonal delivery expectation applies per program text).",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        declineReason:
          "Gestational age outside program window — 32–36 weeks gestation required",
      });
    }
    if (!deliverDuringRsvSeason) {
      return result({
        outcome: "conditional",
        confidence: "medium",
        rationale: [
          "Ontario lists eligibility for pregnant individuals 32–36 weeks who will deliver during the RSV season. Delivery timing relative to RSV season is unclear from the profile.",
        ],
        missingInformation: [
          "Confirm expected delivery during the RSV season per MOH guidance",
        ],
        primarySourceUrl: SOURCES.onPrograms,
      });
    }
    return result({
      outcome: "covered",
      confidence: "high",
      rationale: [
        "Ontario funds Abrysvo for pregnant individuals at 32–36 weeks gestation who are Ontario residents and will deliver during RSV season.",
      ],
      primarySourceUrl: SOURCES.onPrograms,
      supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.naciOlderAdults],
      dispensingContext: ON_PHARMACY_CONTEXT,
      naciNote:
        "NACI strongly recommends Abrysvo for pregnant individuals at 28–36 weeks gestation during RSV season (Grade A).",
    });
  }

  if (product === "Arexvy" && pregnant) {
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Ontario's pregnancy RSV program references Abrysvo for maternal immunization. Arexvy selection for pregnancy should be verified against current MOH and product monograph guidance.",
      ],
      primarySourceUrl: SOURCES.onPrograms,
      supportingSourceUrls: [SOURCES.hcArexvy],
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (previouslyReceivedPublicAdultRsv) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Ontario's adult RSV program funds those who have not previously received a publicly funded RSV vaccine.",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        declineReason:
          "Previously received a publicly funded adult RSV dose — one-dose limit applies under the Ontario program",
      });
    }
    if (ageYears >= 75) {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "Ontario funds Arexvy and Abrysvo for adults 75+ who have not previously received a publicly funded RSV vaccine.",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
        dispensingContext: ON_PHARMACY_CONTEXT,
        naciNote:
          "NACI strongly recommends RSV vaccination for all adults 75 years and older (Grade A).",
      });
    }
    if (ageYears >= 60 && ageYears <= 74) {
      if (ontarioAdultRiskMet(conditionIds)) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "Ontario funds adults 60–74 who meet listed high-risk or setting criteria and have not received a prior publicly funded adult RSV dose.",
          ],
          primarySourceUrl: SOURCES.onPrograms,
          supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
          dispensingContext: ON_PHARMACY_CONTEXT,
          naciNote:
            "NACI discretionarily recommends RSV vaccination for all adults 60–74 (Grade B). This patient also qualifies under Ontario's public program.",
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "Ontario funds adults 60–74 only when specific high-risk or higher-risk setting criteria apply.",
        ],
        missingInformation: [
          "Confirm a listed Ontario 60–74 eligibility criterion",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        declineReason:
          "No qualifying high-risk criterion selected for the 60–74 age band",
        naciNote:
          "NACI discretionarily recommends RSV vaccination for all adults 60–74 (Grade B), regardless of risk group.",
        coverageGap:
          "This patient does not meet Ontario's public criteria but NACI recommends RSV vaccination for all adults 60–74. Private-pay vaccination may be appropriate.",
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Patient appears outside Ontario's publicly funded adult RSV age bands (60–74 with criteria, or 75+), or pregnancy/infant pathways apply instead.",
      ],
      primarySourceUrl: SOURCES.onPrograms,
      declineReason:
        "Outside eligible age range — Ontario's adult RSV public program covers ages 60–74 with high-risk criteria, or 75+",
      naciNote:
        "NACI guidance on RSV vaccination for adults under 60 without high-risk conditions is limited.",
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      "Unable to classify this Ontario RSV scenario with current inputs.",
    ],
    primarySourceUrl: SOURCES.onPrograms,
  });
}

function evaluateNovaScotia(input: CoverageInput): CoverageResult {
  const { product, ageYears, conditionIds } = input;

  if (product === "Beyfortus") {
    return result({
      outcome: "conditional",
      confidence: "low",
      rationale: [
        "V0 models Nova Scotia's adult RSV program from the provincial FAQ. Infant / Beyfortus programs are not encoded—verify with Nova Scotia CDPD / program updates.",
      ],
      primarySourceUrl: SOURCES.nsAdultFaq,
      supportingSourceUrls: [SOURCES.hcBeyfortus],
    });
  }

  if (ageYears >= 75) {
    return result({
      outcome: "covered",
      confidence: "high",
      rationale: [
        "Nova Scotia's adult RSV program lists publicly funded vaccine for adults 75 years and older.",
      ],
      primarySourceUrl: SOURCES.nsAdultFaq,
      supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
      naciNote:
        "NACI strongly recommends RSV vaccination for all adults 75 and older (Grade A).",
    });
  }

  if (
    ageYears >= 60 &&
    (has(conditionIds, "lct_retirement_resident") ||
      has(conditionIds, "alc_hospital"))
  ) {
    return result({
      outcome: "covered",
      confidence: "high",
      rationale: [
        "Nova Scotia funds adults 60+ in long-term care, nursing homes, RCF, or hospital inpatients 60+ awaiting placement (map your patient to those settings).",
      ],
      primarySourceUrl: SOURCES.nsAdultFaq,
      naciNote:
        "NACI discretionarily recommends RSV vaccination for all adults 60–74 (Grade B). This patient also meets Nova Scotia's care setting criterion.",
    });
  }

  return result({
    outcome: "not_covered",
    confidence: "medium",
    rationale: [
      "Nova Scotia's publicly funded adult RSV program in the FAQ covers adults 75+ or certain 60+ in LTC / specified facility settings.",
    ],
    missingInformation: [
      "If 60–74, confirm LTC / nursing home / RCF / inpatient awaiting placement status",
    ],
    primarySourceUrl: SOURCES.nsAdultFaq,
    declineReason:
      "Age or care setting criterion not met — Nova Scotia's public program requires 75+, or 60+ in LTC/nursing home/RCF/hospital awaiting placement",
    naciNote:
      "NACI discretionarily recommends RSV vaccination for all adults 60–74 (Grade B), including those in community settings.",
    coverageGap:
      "Nova Scotia's public program covers specific care settings only. NACI recommends vaccination for all adults 60–74; private-pay may be appropriate for community-dwelling adults.",
  });
}

function evaluateQuebec(input: CoverageInput): CoverageResult {
  const { product, ageYears, pregnant, gestationalWeeks, conditionIds } = input;

  if (product === "Beyfortus") {
    return result({
      outcome: "conditional",
      confidence: "low",
      rationale: [
        "Québec's PIQ page details Arexvy/Abrysvo indications; infant monoclonal programs are not modeled in V0—verify current MSSS bulletins.",
      ],
      primarySourceUrl: SOURCES.qcPiq,
      supportingSourceUrls: [SOURCES.hcBeyfortus],
    });
  }

  if (product === "Abrysvo" && pregnant) {
    if (gestationalWeeks === undefined) {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Québec PIQ: Abrysvo is indicated for pregnancy between 32 and 36 weeks gestation (per MSSS page).",
        ],
        missingInformation: ["Gestational age (weeks)"],
        primarySourceUrl: SOURCES.qcPiq,
      });
    }
    if (gestationalWeeks >= 32 && gestationalWeeks <= 36) {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "MSSS PIQ lists Abrysvo for pregnant individuals from 32nd through 36th week of pregnancy (season-independent per page text).",
        ],
        primarySourceUrl: SOURCES.qcPiq,
        supportingSourceUrls: [SOURCES.hcAbrysvo],
        naciNote:
          "NACI strongly recommends Abrysvo for pregnant individuals at 28–36 weeks gestation during RSV season (Grade A).",
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Abrysvo maternal dosing in Québec is tied to 32–36 weeks gestation per PIQ; outside that window does not match the stated indication.",
      ],
      primarySourceUrl: SOURCES.qcPiq,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (ageYears >= 60) {
      return result({
        outcome: "covered",
        confidence: "medium",
        rationale: [
          "MSSS PIQ includes broad adult indications including vaccination of people 60 years and older—confirm the patient's setting (CHSLD, RPA category, transplant, etc.) against the full indication list for your scenario.",
        ],
        primarySourceUrl: SOURCES.qcPiq,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
        naciNote:
          "NACI discretionarily recommends RSV vaccination for adults 60–74 (Grade B) and strongly recommends for adults 75+ (Grade A).",
      });
    }
    if (
      ageYears >= 18 &&
      (has(conditionIds, "transplant") || has(conditionIds, "dialysis"))
    ) {
      return result({
        outcome: "conditional",
        confidence: "medium",
        rationale: [
          "Québec PIQ lists additional adult pathways (e.g., transplant history). V0 does not exhaust all PIQ bullets—verify remaining criteria on the MSSS page.",
        ],
        primarySourceUrl: SOURCES.qcPiq,
        naciNote:
          "NACI notes that adults with transplant history or dialysis may have heightened RSV risk.",
      });
    }
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      "Patient profile does not clearly match the simplified Québec rules encoded in V0; review MSSS PIQ indications for age bands 18–59 and residential categories.",
    ],
    primarySourceUrl: SOURCES.qcPiq,
    missingInformation: ["Review full Québec PIQ indication list for this patient"],
  });
}

export function evaluateCoverage(input: CoverageInput): CoverageResult {
  switch (input.jurisdiction) {
    case "ON":
      return evaluateOntario(input);
    case "NS":
      return evaluateNovaScotia(input);
    case "QC":
      return evaluateQuebec(input);
    default:
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: ["Unknown jurisdiction."],
      });
  }
}
