import {
  isCovidProduct,
  isHpvProduct,
  type ConditionId,
  type CoverageInput,
  type CoverageResult,
  type NaciVsHcGap,
} from "./types";
import { SOURCES } from "./sources";
import { evaluateShingles } from "./evaluate-shingles";
import { evaluateHpv } from "./evaluate-hpv";
import { evaluateCovid } from "./evaluate-covid";
import { noEncodedProvincialProgramResult } from "./no-encoded-result";

const ON_PHARMACY_CONTEXT =
  "Ontario's MOH states that free RSV immunizations are not available through pharmacies for older adults, infants and high-risk children, and pregnant individuals; publicly funded supply is ordered via public health / OGPMSS. Patients using pharmacy may pay out of pocket with a prescription.";

// ─── HC-vs-NACI gap objects (RSV) ─────────────────────────────────────────────

const RSV_NACI_VS_HC_75PLUS: NaciVsHcGap = {
  hcIndication: "Adults 60+ (single dose)",
  naciGrade: "Grade A · Adults 75+",
  alignment: "full",
};

const RSV_NACI_VS_HC_60_74: NaciVsHcGap = {
  hcIndication: "Adults 60+ (single dose)",
  naciGrade: "Grade B · Adults 60–74 (discretionary)",
  alignment: "partial",
  gapDetail: "Ages 60–74 are HC-approved but only NACI Grade B — not a strong-gap candidate under a NACI Grade A funding gate",
};

const RSV_NACI_VS_HC_PREGNANT: NaciVsHcGap = {
  hcIndication: "Pregnant individuals 24–36 weeks gestation (Abrysvo)",
  naciGrade: "Grade A · Pregnant 28–36 weeks (RSV season)",
  alignment: "partial",
  gapDetail: "24–27 weeks: HC-approved but outside the NACI Grade A window",
};

const RSV_NACI_VS_HC_BEYFORTUS: NaciVsHcGap = {
  hcIndication: "Neonates/infants (first season); high-risk children under 24 months",
  naciGrade: "Grade A · All infants (first RSV season)",
  alignment: "full",
};

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
    naciVsHcGap: partial.naciVsHcGap,
    publicProgramPayerNote: partial.publicProgramPayerNote,
  };
}

/** When the province funds the dose, private payers should not duplicate that payment. */
export function withPublicProgramPayerNote(r: CoverageResult): CoverageResult {
  if (r.outcome !== "covered") return r;
  return {
    ...r,
    publicProgramPayerNote:
      "Public program appears to fund this scenario when program criteria are met — billing is usually provincial. GreenShield should not pay for the same dose or indication the province already covers.",
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

/** Beyfortus public infant programs use an under-24-months window. Combine years + months so e.g. 2y 0m is not misread when only the months field was filled. */
function totalAgeMonthsForBeyfortus(input: CoverageInput): "unknown" | number {
  const y = input.ageYears;
  const m = input.ageMonths;
  if (Number.isNaN(y) || y < 0) return "unknown";
  if (m !== undefined && !Number.isNaN(m)) {
    return y * 12 + m;
  }
  if (y >= 2) {
    return y * 12;
  }
  return "unknown";
}

const BEYFORTUS_MAX_AGE_MONTHS = 23;
const BEYFORTUS_NOT_COVERED_RATIONALE_ON =
  "Ontario's infant RSV program describes Beyfortus for eligible infants under 24 months meeting program criteria—not at or above 24 months.";

// ─── Ontario ──────────────────────────────────────────────────────────────────

function evaluateOntario(input: CoverageInput): CoverageResult {
  const {
    product,
    ageYears,
    pregnant,
    gestationalWeeks,
    deliverDuringRsvSeason,
    previouslyReceivedPublicAdultRsv,
    pediatricSpecialistDiscussed,
    conditionIds,
  } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Beyfortus eligibility in Ontario depends on total age under 24 months (years + months) and specific high-risk criteria with pediatric specialist involvement.",
        ],
        missingInformation: [
          "Infant age: enter years and months (e.g. 1 year 6 months) so total age can be compared to the under-24-month program limit.",
        ],
        primarySourceUrl: SOURCES.onPrograms,
        supportingSourceUrls: [SOURCES.hcBeyfortus],
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [BEYFORTUS_NOT_COVERED_RATIONALE_ON],
        primarySourceUrl: SOURCES.onPrograms,
        supportingSourceUrls: [SOURCES.hcBeyfortus],
        declineReason: "Age not met — program requires infant under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
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
          naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
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
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
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
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
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
        naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
        naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
        naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
      naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
      naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
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
        naciVsHcGap: RSV_NACI_VS_HC_75PLUS,
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
          naciVsHcGap: RSV_NACI_VS_HC_60_74,
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
        naciVsHcGap: RSV_NACI_VS_HC_60_74,
        coverageGap:
          input.considerNaci === true
            ? undefined  // NACI Grade B only for 60–74 — not a gap under Grade A gate
            : "Adults 60–74 are HC-approved for RSV but Ontario doesn't fund this group without high-risk criteria.",
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
      naciVsHcGap: RSV_NACI_VS_HC_60_74,
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      "Unable to classify this Ontario RSV scenario with current inputs.",
    ],
    primarySourceUrl: SOURCES.onPrograms,
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── Nova Scotia ──────────────────────────────────────────────────────────────

function evaluateNovaScotia(input: CoverageInput): CoverageResult {
  const { product, ageYears, conditionIds } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Nova Scotia infant nirsevimab (Beyfortus) public funding follows provincial program criteria. Enter the child's age in years and months to compare against the under-24-month framing used for infant monoclonal programs.",
        ],
        missingInformation: [
          "Infant age in years and months (total under 24 months is the usual funded window for infant RSV monoclonal programs—confirm with CDPD).",
        ],
        primarySourceUrl: SOURCES.hcBeyfortus,
        supportingSourceUrls: [SOURCES.nsAdultFaq],
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Public infant RSV monoclonal programs fund Beyfortus only for eligible children under 24 months. At or above 24 months total age does not match that funded infant window—confirm any exceptional pathways with Nova Scotia CDPD.",
        ],
        primarySourceUrl: SOURCES.hcBeyfortus,
        supportingSourceUrls: [SOURCES.nsAdultFaq],
        declineReason: "Age not met — infant program window is under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months by total age. Nova Scotia publicly funded nirsevimab eligibility depends on current CDPD / immunization program criteria (risk groups, seasons, settings). The linked FAQ focuses on adult RSV; verify infant program details with CDPD.",
      ],
      primarySourceUrl: SOURCES.hcBeyfortus,
      supportingSourceUrls: [SOURCES.nsAdultFaq],
      missingInformation: [
        "Confirm the patient meets Nova Scotia–listed infant nirsevimab criteria on the current provincial program",
      ],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
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
      naciVsHcGap: RSV_NACI_VS_HC_75PLUS,
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
      naciVsHcGap: RSV_NACI_VS_HC_60_74,
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
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
    coverageGap:
      input.considerNaci === true
        ? undefined  // NACI Grade B only for community 60–74 — not a gap under Grade A gate
        : "Adults 60–74 in the community are HC-approved for RSV but Nova Scotia doesn't publicly fund this group.",
  });
}

// ─── Quebec ───────────────────────────────────────────────────────────────────

function evaluateQuebec(input: CoverageInput): CoverageResult {
  const { product, ageYears, pregnant, gestationalWeeks, conditionIds } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Québec MSSS PIQ covers RSV immunization including infant contexts; nirsevimab (Beyfortus) eligibility is age- and program-based. Enter years and months to assess the usual under-24-month infant window against the product monograph and PIQ.",
        ],
        missingInformation: ["Infant age in years and months"],
        primarySourceUrl: SOURCES.qcPiq,
        supportingSourceUrls: [SOURCES.hcBeyfortus],
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Health Canada–authorized Beyfortus indications for RSV prevention target neonates/infants and eligible high-risk children under 24 months—not at or above 24 months total age. Québec funding follows MSSS rules tied to those indications; above 24 months does not match the funded infant monoclonal window.",
        ],
        primarySourceUrl: SOURCES.qcPiq,
        supportingSourceUrls: [SOURCES.hcBeyfortus],
        declineReason: "Age not met — infant nirsevimab window is under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months by total age. Confirm nirsevimab funding, risk groups, and seasonality against the MSSS PIQ (VRS) page and any MSSS bulletins.",
      ],
      primarySourceUrl: SOURCES.qcPiq,
      supportingSourceUrls: [SOURCES.hcBeyfortus],
      missingInformation: [
        "Confirm patient meets current Québec-listed criteria for publicly funded nirsevimab",
      ],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
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
        naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
        naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Abrysvo maternal dosing in Québec is tied to 32–36 weeks gestation per PIQ; outside that window does not match the stated indication.",
      ],
      primarySourceUrl: SOURCES.qcPiq,
      naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
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
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
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
          "Québec PIQ lists additional adult pathways (e.g., transplant history). Encoded rules here are simplified — verify remaining criteria on the MSSS page.",
        ],
        primarySourceUrl: SOURCES.qcPiq,
        naciNote:
          "NACI notes that adults with transplant history or dialysis may have heightened RSV risk.",
        naciVsHcGap: RSV_NACI_VS_HC_60_74,
      });
    }
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      "Patient profile does not clearly match the simplified Québec rules used here; review MSSS PIQ indications for age bands 18–59 and residential categories.",
    ],
    primarySourceUrl: SOURCES.qcPiq,
    missingInformation: ["Review full Québec PIQ indication list for this patient"],
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── Alberta ──────────────────────────────────────────────────────────────────
// Source: Alberta Pharmacy Association — RSV Immunization Program Eligibility Expansion (March 10, 2025)
// Adults 70+ community; adults 60–69 in LTC/supportive living or First Nations/Métis/Inuit

function evaluateAlberta(input: CoverageInput): CoverageResult {
  const {
    product,
    ageYears,
    pregnant,
    conditionIds,
    previouslyReceivedPublicAdultRsv,
  } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Alberta publicly funds nirsevimab (Beyfortus) for eligible infants. Enter age in years and months to check against the under-24-month window.",
        ],
        missingInformation: ["Infant age in years and months"],
        primarySourceUrl: SOURCES.abRsv,
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: ["Alberta's infant RSV (nirsevimab/Beyfortus) program covers eligible children under 24 months."],
        primarySourceUrl: SOURCES.abRsv,
        declineReason: "Age not met — infant program requires under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months. Confirm eligibility for Alberta's publicly funded nirsevimab program with Alberta Health Services.",
      ],
      primarySourceUrl: SOURCES.abRsv,
      missingInformation: ["Confirm the infant meets Alberta's high-risk or program eligibility criteria with AHS"],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  if (product === "Abrysvo" && pregnant) {
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Confirm whether Alberta publicly funds maternal Abrysvo (RSV vaccination in pregnancy) and at what gestational age window with Alberta Health Services.",
      ],
      primarySourceUrl: SOURCES.abRsv,
      supportingSourceUrls: [SOURCES.hcAbrysvo],
      missingInformation: ["Confirm Alberta maternal Abrysvo program eligibility and gestational age window"],
      naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (previouslyReceivedPublicAdultRsv) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Alberta's adult RSV immunization program is a single-dose, one-time program — a prior publicly funded RSV dose makes the patient ineligible for repeat public funding.",
        ],
        primarySourceUrl: SOURCES.abRsv,
        declineReason: "Previously received a publicly funded adult RSV dose — one-dose limit applies",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    if (ageYears >= 70) {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "Alberta's RSV program (expanded March 2025) funds community-dwelling adults 70 years and older who have not previously received a publicly funded RSV vaccine.",
        ],
        primarySourceUrl: SOURCES.abRsv,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy, SOURCES.naciOlderAdults],
        naciNote: "NACI strongly recommends RSV vaccination for all adults 75+ (Grade A); discretionarily recommends for adults 60–74 (Grade B).",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    if (ageYears >= 60) {
      if (has(conditionIds, "lct_retirement_resident") || has(conditionIds, "indigenous")) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "Alberta funds RSV vaccine for adults aged 60–69 who reside in long-term care or supportive living settings, and for First Nations, Métis, or Inuit adults 60 years and older.",
          ],
          primarySourceUrl: SOURCES.abRsv,
          supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
          naciNote: "NACI discretionarily recommends RSV vaccination for adults 60–74 (Grade B).",
          naciVsHcGap: RSV_NACI_VS_HC_60_74,
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "Alberta's adult RSV program covers community-dwelling adults 70+, adults 60–69 in LTC/supportive living, and First Nations/Métis/Inuit adults 60+. This patient does not appear to meet those criteria.",
        ],
        missingInformation: ["Confirm LTC/supportive living residency or Indigenous status for 60–69 eligibility"],
        primarySourceUrl: SOURCES.abRsv,
        declineReason: "Age 60–69 without qualifying criterion — Alberta requires 70+, LTC residency, or Indigenous status for this band",
        naciNote: "NACI discretionarily recommends RSV vaccination for all adults 60–74 (Grade B), regardless of risk group.",
        naciVsHcGap: RSV_NACI_VS_HC_60_74,
        coverageGap:
          input.considerNaci === true
            ? undefined
            : "Adults 60–69 in the community are HC-approved for RSV but Alberta does not publicly fund this group without LTC or Indigenous pathway.",
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Patient is outside Alberta's funded adult RSV age bands (60+ with LTC/Indigenous criteria, or 70+ community-dwelling).",
      ],
      primarySourceUrl: SOURCES.abRsv,
      declineReason: "Outside eligible age range — Alberta adult RSV program requires 70+ (community) or 60+ with LTC/Indigenous criterion",
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: ["Unable to classify this Alberta RSV scenario with current inputs."],
    primarySourceUrl: SOURCES.abRsv,
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── British Columbia ─────────────────────────────────────────────────────────
// Source: HealthLinkBC — RSV vaccine file
// Adults 75+ (priority); adults 60–74 in residential/facility settings; high-risk infants; single dose

function evaluateBC(input: CoverageInput): CoverageResult {
  const {
    product,
    ageYears,
    pregnant,
    conditionIds,
    previouslyReceivedPublicAdultRsv,
  } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "BC publicly funds nirsevimab (Beyfortus) for high-risk infants. Enter age in years and months to check against the under-24-month window.",
        ],
        missingInformation: ["Infant age in years and months"],
        primarySourceUrl: SOURCES.bcRsv,
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: ["BC's infant RSV monoclonal program covers eligible children under 24 months."],
        primarySourceUrl: SOURCES.bcRsv,
        declineReason: "Age not met — infant program requires under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months. HealthLinkBC describes nirsevimab as funded for high-risk infants — confirm current BC eligibility criteria with BCCDC or your local public health unit.",
      ],
      primarySourceUrl: SOURCES.bcRsv,
      missingInformation: ["Confirm the infant meets BC's high-risk criteria for publicly funded nirsevimab (Beyfortus)"],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  if (product === "Abrysvo" && pregnant) {
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Confirm current BC program criteria for maternal Abrysvo (RSV vaccination in pregnancy) with HealthLinkBC or BCCDC — gestational age window and program availability should be verified.",
      ],
      primarySourceUrl: SOURCES.bcRsv,
      supportingSourceUrls: [SOURCES.hcAbrysvo],
      missingInformation: ["Confirm BC maternal Abrysvo public program eligibility and gestational age window with BCCDC"],
      naciVsHcGap: RSV_NACI_VS_HC_PREGNANT,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (previouslyReceivedPublicAdultRsv) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "BC's adult RSV vaccine program is a single dose — a prior publicly funded RSV dose makes the patient ineligible for repeat public funding.",
        ],
        primarySourceUrl: SOURCES.bcRsv,
        declineReason: "Previously received a publicly funded adult RSV dose — one-dose limit applies",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    if (ageYears >= 75) {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "HealthLinkBC identifies adults 75 years and older as a priority group for publicly funded RSV vaccination in British Columbia.",
        ],
        primarySourceUrl: SOURCES.bcRsv,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy, SOURCES.naciOlderAdults],
        naciNote: "NACI strongly recommends RSV vaccination for all adults 75+ (Grade A).",
        naciVsHcGap: RSV_NACI_VS_HC_75PLUS,
      });
    }
    if (ageYears >= 60 && ageYears <= 74) {
      if (has(conditionIds, "lct_retirement_resident")) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "HealthLinkBC describes adults 60–74 in residential care/facility settings as eligible for publicly funded RSV vaccination in BC.",
          ],
          primarySourceUrl: SOURCES.bcRsv,
          supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
          naciNote: "NACI discretionarily recommends RSV vaccination for adults 60–74 (Grade B).",
          naciVsHcGap: RSV_NACI_VS_HC_60_74,
        });
      }
      return result({
        outcome: "conditional",
        confidence: "medium",
        rationale: [
          "HealthLinkBC notes community-dwelling adults 60–74 should consult their provider about RSV vaccine eligibility — public program criteria for this group are not uniformly stated on the page; confirm current eligibility at the HealthLinkBC link.",
        ],
        primarySourceUrl: SOURCES.bcRsv,
        missingInformation: ["Confirm current BC eligibility criteria for community-dwelling adults 60–74 at HealthLinkBC or with a health provider"],
        naciNote: "NACI discretionarily recommends RSV vaccination for adults 60–74 (Grade B).",
        naciVsHcGap: RSV_NACI_VS_HC_60_74,
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Patient appears outside BC's funded adult RSV age bands (75+ priority, or 60–74 in residential care settings).",
      ],
      primarySourceUrl: SOURCES.bcRsv,
      declineReason: "Outside eligible age range — BC adult RSV program covers adults 60+ (criteria apply for 60–74)",
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: ["Unable to classify this British Columbia RSV scenario with current inputs."],
    primarySourceUrl: SOURCES.bcRsv,
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── Manitoba ─────────────────────────────────────────────────────────────────
// Source: Manitoba Health — Vaccine Eligibility page (gov.mb.ca)
// Adults 60+ in personal care homes (PCH); all infants first RSV season from April 2026; single dose

function evaluateManitoba(input: CoverageInput): CoverageResult {
  const {
    product,
    ageYears,
    conditionIds,
    previouslyReceivedPublicAdultRsv,
  } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Manitoba publicly funds RSV antibody product (nirsevimab/Beyfortus) for all infants in their first RSV season (Oct–Mar), starting April 2026, and for high-risk children entering a second season. Enter age in years and months to check the under-24-month window.",
        ],
        missingInformation: ["Infant age in years and months"],
        primarySourceUrl: SOURCES.mbRsv,
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: ["Manitoba's infant RSV monoclonal program covers eligible children under 24 months."],
        primarySourceUrl: SOURCES.mbRsv,
        declineReason: "Age not met — infant program requires under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months. Manitoba funds nirsevimab for all infants in their first RSV season (October–March) starting April 2026, and for high-risk children in the second season — confirm current program timing and criteria with Manitoba Health.",
      ],
      primarySourceUrl: SOURCES.mbRsv,
      missingInformation: ["Confirm current Manitoba infant nirsevimab program timing and eligibility criteria"],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (previouslyReceivedPublicAdultRsv) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Manitoba's adult RSV program is a single-dose program — a prior publicly funded RSV dose makes the patient ineligible.",
        ],
        primarySourceUrl: SOURCES.mbRsv,
        declineReason: "Previously received a publicly funded adult RSV dose — one-dose limit applies",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    if (ageYears >= 60 && has(conditionIds, "lct_retirement_resident")) {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "Manitoba publicly funds RSV vaccine for adults 60 years and older residing in personal care homes (PCH) and similar residential care settings who have not previously received a publicly funded RSV dose.",
        ],
        primarySourceUrl: SOURCES.mbRsv,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy, SOURCES.naciOlderAdults],
        naciNote: "NACI discretionarily recommends RSV for adults 60–74 (Grade B); strongly recommends for adults 75+ (Grade A).",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Manitoba's publicly funded adult RSV program is currently restricted to adults 60+ who are residents of personal care homes — community-dwelling adults are not covered under the current program.",
      ],
      missingInformation: [
        "Confirm personal care home / residential care residency status for 60+ eligibility",
        "Check Manitoba Health page for any expansions beyond PCH residents",
      ],
      primarySourceUrl: SOURCES.mbRsv,
      declineReason: "Manitoba adult RSV public program is restricted to personal care home residents 60+ (no community-dwelling program encoded)",
      naciNote: "NACI discretionarily recommends RSV for adults 60–74 (Grade B); strongly recommends for adults 75+ (Grade A).",
      naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: ["Unable to classify this Manitoba RSV scenario with current inputs."],
    primarySourceUrl: SOURCES.mbRsv,
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── New Brunswick ────────────────────────────────────────────────────────────
// Source: GNB — NB Prescription Drug Program public health plan (rsv-vaccine)
// Adults 75+ community; First Nations/Métis/Inuit 60+; LTC residents 60+; not an annual vaccine

function evaluateNewBrunswick(input: CoverageInput): CoverageResult {
  const {
    product,
    ageYears,
    conditionIds,
    previouslyReceivedPublicAdultRsv,
  } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "New Brunswick's publicly funded infant RSV program eligibility requires age verification. Enter age in years and months.",
        ],
        missingInformation: ["Infant age in years and months"],
        primarySourceUrl: SOURCES.nbRsv,
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: ["NB's infant RSV program covers eligible infants under 24 months."],
        primarySourceUrl: SOURCES.nbRsv,
        declineReason: "Age not met — infant program requires under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months. Confirm New Brunswick infant nirsevimab (Beyfortus) eligibility criteria with the NB Prescription Drug Program.",
      ],
      primarySourceUrl: SOURCES.nbRsv,
      missingInformation: ["Confirm NB infant nirsevimab eligibility with the provincial drug program"],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (previouslyReceivedPublicAdultRsv) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "New Brunswick's RSV program is a one-time (not annual) vaccine — previously vaccinated individuals are not eligible for repeat public funding.",
        ],
        primarySourceUrl: SOURCES.nbRsv,
        declineReason: "Previously received a publicly funded adult RSV dose — NB program is not an annual vaccine",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    if (ageYears >= 75) {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "New Brunswick's public RSV program covers community-dwelling adults 75 years and older who have not previously received a publicly funded RSV vaccine.",
        ],
        primarySourceUrl: SOURCES.nbRsv,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy, SOURCES.naciOlderAdults],
        naciNote: "NACI strongly recommends RSV vaccination for all adults 75+ (Grade A).",
        naciVsHcGap: RSV_NACI_VS_HC_75PLUS,
      });
    }
    if (ageYears >= 60) {
      if (has(conditionIds, "lct_retirement_resident") || has(conditionIds, "indigenous")) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "New Brunswick funds RSV vaccine for adults 60 years and older who reside in long-term care settings, and for First Nations, Métis, or Inuit adults aged 60 and older.",
          ],
          primarySourceUrl: SOURCES.nbRsv,
          supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
          naciNote: "NACI discretionarily recommends RSV vaccination for adults 60–74 (Grade B).",
          naciVsHcGap: RSV_NACI_VS_HC_60_74,
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "New Brunswick funds RSV vaccine for: community-dwelling adults 75+, adults 60+ in long-term care, and First Nations/Métis/Inuit adults 60+. This patient does not appear to meet those criteria.",
        ],
        missingInformation: ["Confirm LTC residency or Indigenous status for 60–74 eligibility"],
        primarySourceUrl: SOURCES.nbRsv,
        declineReason: "Age 60–74 without LTC or Indigenous pathway — NB program requires 75+, LTC, or Indigenous status for this band",
        naciNote: "NACI discretionarily recommends RSV vaccination for all adults 60–74 (Grade B), regardless of risk group.",
        naciVsHcGap: RSV_NACI_VS_HC_60_74,
        coverageGap:
          input.considerNaci === true
            ? undefined
            : "Adults 60–74 in the community are HC-approved for RSV but NB does not publicly fund without LTC or Indigenous criterion.",
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "Patient is outside New Brunswick's funded adult RSV age bands (75+ community, or 60+ in LTC/Indigenous pathway).",
      ],
      primarySourceUrl: SOURCES.nbRsv,
      declineReason: "Outside eligible age range for NB adult RSV program",
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: ["Unable to classify this New Brunswick RSV scenario with current inputs."],
    primarySourceUrl: SOURCES.nbRsv,
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── Newfoundland & Labrador ──────────────────────────────────────────────────
// Source: NL Health press release March 28, 2025 — RSV vaccine expansion
// Adults 60+ in congregate living facilities; community-dwelling adults not yet covered

function evaluateNL(input: CoverageInput): CoverageResult {
  const { product, ageYears, conditionIds } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM === "unknown") {
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Confirm NL infant nirsevimab (Beyfortus) program eligibility with NL Health Services — enter age in years and months.",
        ],
        missingInformation: ["Infant age in years and months; confirm NL infant nirsevimab eligibility"],
        primarySourceUrl: SOURCES.nlRsv,
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    if (totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: ["Infant RSV monoclonal programs cover eligible children under 24 months."],
        primarySourceUrl: SOURCES.nlRsv,
        declineReason: "Age not met — infant program requires under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Child is under 24 months. Confirm NL infant nirsevimab (Beyfortus) eligibility and program criteria with NL Health Services.",
      ],
      primarySourceUrl: SOURCES.nlRsv,
      missingInformation: ["Confirm NL infant nirsevimab program eligibility and criteria with NL Health Services"],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    if (ageYears >= 60 && has(conditionIds, "lct_retirement_resident")) {
      return result({
        outcome: "covered",
        confidence: "medium",
        rationale: [
          "NL Health's March 2025 RSV expansion covers adults 60 years and older residing in congregate living facilities (long-term care, personal care homes, and similar settings).",
        ],
        primarySourceUrl: SOURCES.nlRsv,
        supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy, SOURCES.naciOlderAdults],
        naciNote: "NACI discretionarily recommends RSV for adults 60–74 (Grade B); strongly recommends for adults 75+ (Grade A).",
        naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
      });
    }
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "NL's public RSV program (March 2025) covers adults 60+ in congregate living facilities — community-dwelling adults are not covered under this program. Check the press release for any subsequent expansions.",
      ],
      missingInformation: [
        "Confirm congregate living/LTC residency status for eligibility",
        "Check for NL program expansions after March 2025",
      ],
      primarySourceUrl: SOURCES.nlRsv,
      declineReason: "NL adult RSV program requires 60+ in congregate/LTC care — community-dwelling adults not covered",
      naciNote: "NACI discretionarily recommends RSV for adults 60–74 (Grade B); strongly recommends for adults 75+ (Grade A).",
      naciVsHcGap: ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74,
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: ["Unable to classify this Newfoundland & Labrador RSV scenario with current inputs."],
    primarySourceUrl: SOURCES.nlRsv,
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── PEI ─────────────────────────────────────────────────────────────────────
// Source: PEI news release August 19, 2025 — RSV protection expanded for infants and seniors

function evaluatePEI(input: CoverageInput): CoverageResult {
  const { product } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM !== "unknown" && totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: ["PEI's infant RSV program covers eligible children under 24 months."],
        primarySourceUrl: SOURCES.peRsv,
        declineReason: "Age not met — infant program requires under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "PEI expanded its publicly funded RSV program in August 2025 to include infants — confirm current nirsevimab (Beyfortus) eligibility criteria with Health PEI.",
      ],
      primarySourceUrl: SOURCES.peRsv,
      missingInformation: ["Confirm PEI infant nirsevimab (Beyfortus) eligibility criteria with Health PEI"],
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  if (product === "Arexvy" || product === "Abrysvo") {
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "PEI expanded its publicly funded RSV program in August 2025 to include seniors — confirm current age threshold and eligibility criteria with Health PEI.",
      ],
      primarySourceUrl: SOURCES.peRsv,
      supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy],
      missingInformation: ["Confirm PEI adult RSV program age threshold and eligibility criteria with Health PEI"],
      naciVsHcGap: RSV_NACI_VS_HC_75PLUS,
    });
  }

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      "PEI expanded its publicly funded RSV program in August 2025. Confirm eligibility for this product with Health PEI.",
    ],
    primarySourceUrl: SOURCES.peRsv,
    missingInformation: ["Confirm eligibility at Health PEI for the current RSV program"],
    naciVsHcGap: RSV_NACI_VS_HC_60_74,
  });
}

// ─── Saskatchewan ─────────────────────────────────────────────────────────────

function evaluateSK(input: CoverageInput): CoverageResult {
  void input;
  return noEncodedProvincialProgramResult({
    jurisdictionDisplayName: "Saskatchewan",
    productLabel: "RSV vaccines",
    primarySourceUrl: SOURCES.skRsv,
  });
}

// ─── Territories ─────────────────────────────────────────────────────────────

function evaluateNT(input: CoverageInput): CoverageResult {
  void input;
  return noEncodedProvincialProgramResult({
    jurisdictionDisplayName: "Northwest Territories",
    productLabel: "RSV vaccines",
    primarySourceUrl: SOURCES.ntRsv,
  });
}

function evaluateNU(input: CoverageInput): CoverageResult {
  void input;
  return noEncodedProvincialProgramResult({
    jurisdictionDisplayName: "Nunavut",
    productLabel: "RSV vaccines",
    primarySourceUrl: SOURCES.nuRsv,
  });
}

function evaluateYT(input: CoverageInput): CoverageResult {
  void input;
  return noEncodedProvincialProgramResult({
    jurisdictionDisplayName: "Yukon",
    productLabel: "RSV vaccines",
    primarySourceUrl: SOURCES.ytRsv,
  });
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function evaluateCoverage(input: CoverageInput): CoverageResult {
  // Shingrix / Shingles pathway
  if (input.product === "Shingrix") {
    return withPublicProgramPayerNote(evaluateShingles(input));
  }

  // HPV — provincial criteria (evaluate-hpv.ts)
  if (isHpvProduct(input.product)) {
    return withPublicProgramPayerNote(evaluateHpv(input));
  }

  // COVID-19 vaccines
  if (isCovidProduct(input.product)) {
    return evaluateCovid(input);
  }

  // RSV pathway
  let r: CoverageResult;
  switch (input.jurisdiction) {
    case "ON": r = evaluateOntario(input); break;
    case "NS": r = evaluateNovaScotia(input); break;
    case "QC": r = evaluateQuebec(input); break;
    case "AB": r = evaluateAlberta(input); break;
    case "BC": r = evaluateBC(input); break;
    case "MB": r = evaluateManitoba(input); break;
    case "NB": r = evaluateNewBrunswick(input); break;
    case "NL": r = evaluateNL(input); break;
    case "PE": r = evaluatePEI(input); break;
    case "SK": r = evaluateSK(input); break;
    case "NT": r = evaluateNT(input); break;
    case "NU": r = evaluateNU(input); break;
    case "YT": r = evaluateYT(input); break;
    default:
      r = result({
        outcome: "conditional",
        confidence: "low",
        rationale: ["Unknown jurisdiction."],
      });
  }
  return withPublicProgramPayerNote(r);
}
