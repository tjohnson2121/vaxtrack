import type { ConditionId, CoverageInput, CoverageResult, NaciVsHcGap } from "./types";
import { SOURCES } from "./sources";
import { evaluateShingles } from "./evaluate-shingles";

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

// ─── Stub helper for provinces with limited encoded rules ────────────────────

function rsvProvinceStub(
  jurisdictionName: string,
  sourceUrl: string,
  input: CoverageInput,
  knownNote?: string,
): CoverageResult {
  const { product, ageYears, considerNaci } = input;

  if (product === "Beyfortus") {
    const totalM = totalAgeMonthsForBeyfortus(input);
    if (totalM !== "unknown" && totalM > BEYFORTUS_MAX_AGE_MONTHS) {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Public infant RSV monoclonal programs fund Beyfortus for eligible children under 24 months. At or above 24 months does not match the funded infant window.",
        ],
        primarySourceUrl: sourceUrl,
        supportingSourceUrls: [SOURCES.hcBeyfortus],
        declineReason: "Age not met — infant program window is under 24 months",
        naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
      });
    }
    return result({
      outcome: "conditional",
      confidence: "low",
      rationale: [
        `${jurisdictionName} infant nirsevimab (Beyfortus) eligibility requires verification against current provincial program criteria.`,
      ],
      primarySourceUrl: sourceUrl,
      supportingSourceUrls: [SOURCES.hcBeyfortus, SOURCES.naciOlderAdults],
      missingInformation: [
        `Confirm current ${jurisdictionName} Beyfortus eligibility at the linked source`,
      ],
      naciNote: "NACI strongly recommends (Grade A) nirsevimab for all infants entering their first RSV season.",
      naciVsHcGap: RSV_NACI_VS_HC_BEYFORTUS,
    });
  }

  // Adult RSV (Abrysvo / Arexvy)
  const naciNote =
    ageYears >= 75
      ? "NACI strongly recommends (Grade A) RSV vaccination for all adults 75 and older."
      : ageYears >= 60
      ? "NACI discretionarily recommends (Grade B) RSV vaccination for adults 60–74."
      : "NACI guidance on RSV vaccination for adults under 60 without high-risk conditions is limited.";

  const naciVsHcGap =
    ageYears >= 75 ? RSV_NACI_VS_HC_75PLUS : RSV_NACI_VS_HC_60_74;

  return result({
    outcome: "conditional",
    confidence: "low",
    rationale: [
      knownNote ??
        `${jurisdictionName}'s RSV program eligibility requires verification at the provincial source. Check the linked URL for current criteria, age thresholds, and funded products.`,
    ],
    primarySourceUrl: sourceUrl,
    supportingSourceUrls: [SOURCES.hcAbrysvo, SOURCES.hcArexvy, SOURCES.naciOlderAdults],
    missingInformation: [
      `Confirm current ${jurisdictionName} adult RSV program eligibility at the linked source`,
    ],
    naciNote,
    naciVsHcGap,
    coverageGap:
      considerNaci === true
        ? `GreenShield gap (NACI-strong policy): ${ageYears >= 75 ? "Adults 75+ — NACI Grade A aligns with HC; check if province funds." : "Adults 60–74 — NACI is Grade B only; not a strong-gap candidate under NACI-gate policy."} Verify ${jurisdictionName} program at the linked source.`
        : `GreenShield gap (monograph minus province): Adults 60+ are within the Health Canada adult RSV indication. Verify ${jurisdictionName}'s public program to identify the funded subgroup and the unfunded gap.`,
  });
}

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
            ? "GreenShield gap (NACI-strong policy): none by default — NACI is discretionary (Grade B) for ages 60–74, while Ontario does not fund community patients without listed criteria. Turning \u201Cconsider NACI\u201D off shows the broader monograph-minus-province gap."
            : "GreenShield gap (monograph minus province, NACI not used as a gate): adults 60–74 without Ontario high-risk or setting criteria are still within the Health Canada adult 60+ RSV indication, but the province does not pay — this is the subgroup where internal plan policy may fund if clinical review supports it.",
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
        ? "GreenShield gap (NACI-strong policy): none by default for this profile — community 60–74 is NACI discretionary while Nova Scotia funds only listed settings or ages 75+."
        : "GreenShield gap (monograph minus province): adults 60–74 in the community match the Health Canada adult 60+ RSV indication, but Nova Scotia does not publicly fund that subgroup — internal plan policy may fund after clinical review.",
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
        "Child is under 24 months by total age. Confirm nirsevimab funding, risk groups, and seasonality against the MSSS PIQ (VRS) page and any MSSS bulletins—VaxTrack does not enumerate every Québec infant criterion.",
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
          "Québec PIQ lists additional adult pathways (e.g., transplant history). V0 does not exhaust all PIQ bullets—verify remaining criteria on the MSSS page.",
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
      "Patient profile does not clearly match the simplified Québec rules encoded in V0; review MSSS PIQ indications for age bands 18–59 and residential categories.",
    ],
    primarySourceUrl: SOURCES.qcPiq,
    missingInformation: ["Review full Québec PIQ indication list for this patient"],
  });
}

// ─── Alberta ──────────────────────────────────────────────────────────────────

function evaluateAlberta(input: CoverageInput): CoverageResult {
  return rsvProvinceStub(
    "Alberta",
    SOURCES.abRsv,
    input,
    "As of March 2025, Alberta expanded its RSV immunization program — verify current eligibility (age thresholds, high-risk criteria) at the Alberta Pharmacy link.",
  );
}

// ─── British Columbia ─────────────────────────────────────────────────────────

function evaluateBC(input: CoverageInput): CoverageResult {
  return rsvProvinceStub("British Columbia", SOURCES.bcRsv, input);
}

// ─── Manitoba ─────────────────────────────────────────────────────────────────

function evaluateManitoba(input: CoverageInput): CoverageResult {
  return rsvProvinceStub("Manitoba", SOURCES.mbRsv, input);
}

// ─── New Brunswick ────────────────────────────────────────────────────────────

function evaluateNewBrunswick(input: CoverageInput): CoverageResult {
  return rsvProvinceStub("New Brunswick", SOURCES.nbRsv, input);
}

// ─── Newfoundland & Labrador ──────────────────────────────────────────────────

function evaluateNL(input: CoverageInput): CoverageResult {
  return rsvProvinceStub(
    "Newfoundland & Labrador",
    SOURCES.nlRsv,
    input,
    "Newfoundland & Labrador announced expanded RSV prevention programming in March 2025 — verify current eligibility at the provincial health release.",
  );
}

// ─── PEI ─────────────────────────────────────────────────────────────────────

function evaluatePEI(input: CoverageInput): CoverageResult {
  return rsvProvinceStub(
    "PEI",
    SOURCES.peRsv,
    input,
    "PEI expanded RSV protection for infants and seniors — verify current eligibility at the provincial announcement.",
  );
}

// ─── Saskatchewan ─────────────────────────────────────────────────────────────

function evaluateSK(input: CoverageInput): CoverageResult {
  return rsvProvinceStub("Saskatchewan", SOURCES.skRsv, input);
}

// ─── Territories ─────────────────────────────────────────────────────────────

function evaluateNT(input: CoverageInput): CoverageResult {
  return rsvProvinceStub(
    "Northwest Territories",
    SOURCES.ntRsv,
    input,
    "Verify RSV immunization eligibility with NWT Health and Social Services using the immunization schedule for health care professionals.",
  );
}

function evaluateNU(input: CoverageInput): CoverageResult {
  return rsvProvinceStub(
    "Nunavut",
    SOURCES.nuRsv,
    input,
    "Nunavut launched an RSV Prevention Program in December 2024 — verify current eligibility at the territorial health announcement.",
  );
}

function evaluateYT(input: CoverageInput): CoverageResult {
  return rsvProvinceStub(
    "Yukon",
    SOURCES.ytRsv,
    input,
    "Verify RSV vaccine eligibility with Yukon Immunization Program using the linked YIP Manual section on RSV vaccines.",
  );
}

// ─── Main dispatcher ──────────────────────────────────────────────────────────

export function evaluateCoverage(input: CoverageInput): CoverageResult {
  // Shingrix / Shingles pathway
  if (input.product === "Shingrix") {
    return withPublicProgramPayerNote(evaluateShingles(input));
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
