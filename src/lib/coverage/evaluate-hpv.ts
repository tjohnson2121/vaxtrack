/**
 * HPV eligibility logic derived from official provincial/territorial pages (April 2026 snapshot:
 * Ontario.ca, HealthLink BC, NS Health, NB gnb.ca, MSSS Québec PIQ, Sask Cancer Agency,
 * NWT HSS, Alberta MyHealth Alberta, NL partnership summary).
 * MB / PE have no encoded rules — returns no_data.
 * NU: encoded from GN public-service announcement (Aug 2013) — Grade 6 girls; verify expansion.
 */

import type {
  ConditionId,
  CoverageInput,
  CoverageResult,
  HpvProduct,
  Jurisdiction,
  NaciVsHcGap,
} from "./types";
import { SOURCES } from "./sources";
import { noEncodedProvincialProgramResult } from "./no-encoded-result";

// ─── HC-vs-NACI gap objects (HPV) ───────────────────────────────────────────
// Source: NACI Updated Recommendations on Human Papillomavirus Vaccines
// (July 24, 2024). Strong for 9–26; discretionary for 27+; strong for
// immunocompromised any age (3-dose series).

/**
 * NACI Strong recommendation: HPV vaccination for individuals 9–20 years
 * (1-dose schedule; 2-dose on individual basis).
 */
const HPV_NACI_9_TO_20: NaciVsHcGap = {
  hcIndication: "Individuals 9–45 years (Gardasil 9)",
  naciGrade: "Grade A · Ages 9–20 (1 dose, strong)",
  naciGradeLetter: "A",
  alignment: "full",
};

/**
 * NACI Strong recommendation: HPV vaccination for individuals 21–26 years
 * (2-dose schedule, 24 weeks apart).
 */
const HPV_NACI_21_TO_26: NaciVsHcGap = {
  hcIndication: "Individuals 9–45 years (Gardasil 9)",
  naciGrade: "Grade A · Ages 21–26 (2 doses, strong)",
  naciGradeLetter: "A",
  alignment: "full",
};

/**
 * NACI Discretionary recommendation: HPV vaccination for individuals 27+
 * (2-dose schedule; shared clinical decision-making).
 */
const HPV_NACI_27_PLUS: NaciVsHcGap = {
  hcIndication: "Individuals 9–45 years (Gardasil 9)",
  naciGrade: "Grade B · Ages 27+ (2 doses, discretionary)",
  naciGradeLetter: "B",
  alignment: "partial",
  gapDetail: "HC approves Gardasil 9 through age 45 but NACI recommendation is discretionary (shared decision-making) for ages 27+",
};

/**
 * NACI Strong recommendation: immunocompromised individuals of any age
 * should receive 3 doses of HPV vaccine.
 */
const HPV_NACI_IMMUNOCOMPROMISED: NaciVsHcGap = {
  hcIndication: "Individuals 9–45 years (Gardasil 9)",
  naciGrade: "Grade A · Immunocompromised (3 doses, strong)",
  naciGradeLetter: "A",
  alignment: "full",
};

/** Under 9: outside HC indication. */
const HPV_NACI_UNDER_9: NaciVsHcGap = {
  hcIndication: "Individuals 9–45 years (Gardasil 9)",
  naciGrade: "N/A · Under 9 (outside indication)",
  alignment: "gap",
  gapDetail: "Under 9 years — outside both HC indication and NACI recommendation",
};

/** Pick the appropriate NACI gap based on patient profile. */
function hpvNaciGap(input: CoverageInput): NaciVsHcGap {
  const { ageYears, conditionIds } = input;
  if (ageYears < 9) return HPV_NACI_UNDER_9;
  if (isImmunocompromised(conditionIds)) return HPV_NACI_IMMUNOCOMPROMISED;
  if (ageYears <= 20) return HPV_NACI_9_TO_20;
  if (ageYears <= 26) return HPV_NACI_21_TO_26;
  return HPV_NACI_27_PLUS;
}

function hpvNaciNote(input: CoverageInput): string {
  const { ageYears, conditionIds } = input;
  if (ageYears < 9) return "HPV vaccination begins at age 9 per both HC indication and NACI recommendation.";
  if (isImmunocompromised(conditionIds)) {
    return "NACI strongly recommends a 3-dose HPV vaccine schedule for immunocompromised individuals regardless of age.";
  }
  if (ageYears <= 20) {
    return "NACI strongly recommends HPV vaccination for individuals 9–20 years (1-dose schedule; 2 doses may be considered on individual basis).";
  }
  if (ageYears <= 26) {
    return "NACI strongly recommends HPV vaccination for individuals 21–26 years (2-dose schedule, doses 24 weeks apart).";
  }
  return "NACI recommends (discretionary) that individuals 27 years and older may receive HPV vaccine through shared clinical decision-making (2-dose schedule).";
}

const HPV_MONOGRAPH: Record<HpvProduct, string> = {
  HpvGardasil: SOURCES.hcHpvGardasil,
  HpvCervarix: SOURCES.hcHpvCervarix,
};

const HPV_PROVINCIAL: Record<Jurisdiction, string> = {
  AB: SOURCES.abHpv,
  BC: SOURCES.bcHpv,
  MB: SOURCES.mbHpv,
  NB: SOURCES.nbHpv,
  NL: SOURCES.nlHpv,
  NS: SOURCES.nsHpv,
  NT: SOURCES.ntHpv,
  NU: SOURCES.nuHpv,
  ON: SOURCES.onHpv,
  PE: SOURCES.peHpv,
  QC: SOURCES.qcHpv,
  SK: SOURCES.skHpv,
  YT: SOURCES.ytHpv,
};

const JURISDICTION_LABEL: Record<Jurisdiction, string> = {
  AB: "Alberta",
  BC: "British Columbia",
  MB: "Manitoba",
  NB: "New Brunswick",
  NL: "Newfoundland & Labrador",
  NS: "Nova Scotia",
  NT: "Northwest Territories",
  NU: "Nunavut",
  ON: "Ontario",
  PE: "Prince Edward Island",
  QC: "Quebec",
  SK: "Saskatchewan",
  YT: "Yukon",
};

function result(
  partial: Omit<CoverageResult, "primarySourceUrl"> & { primarySourceUrl?: string }
): CoverageResult {
  return {
    primarySourceUrl: partial.primarySourceUrl ?? SOURCES.onHpv,
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

function uniqueUrls(urls: string[]): string[] {
  return [...new Set(urls)];
}

function supportingRefs(product: HpvProduct): string[] {
  return uniqueUrls([
    HPV_MONOGRAPH[product],
    SOURCES.naciHpvPdf,
    SOURCES.naciHpvSummaryHtml,
    SOURCES.cigHpv,
    SOURCES.cdcHpv,
    SOURCES.partnershipEliminationCervical,
    SOURCES.partnershipCervicalScreeningQI2016,
    SOURCES.partnershipHpvAccess2022,
    SOURCES.hpvGlobalActionPrograms,
    SOURCES.naoRapidReview36,
    SOURCES.partnershipHpvDelivery,
    SOURCES.cancerSocietyHpv,
  ]);
}

function isMsm(c: ConditionId[]): boolean {
  return c.includes("msm_gbmsm");
}

function isImmunocompromised(c: ConditionId[]): boolean {
  return c.some((x) =>
    ["gn_immunocompromised", "dialysis", "transplant"].includes(x)
  );
}

function qcImmunocompromisedForHpv(c: ConditionId[]): boolean {
  return isImmunocompromised(c);
}

function underNineNotFunded(
  age: number,
  provUrl: string,
  product: HpvProduct,
  input: CoverageInput,
): CoverageResult | null {
  if (age >= 9) return null;
  return result({
    outcome: "not_covered",
    confidence: "high",
    rationale: [
      "Canadian Immunization Guide and provincial schedules routinely offer publicly funded HPV vaccination starting at age 9 years — this patient is under 9.",
    ],
    primarySourceUrl: provUrl,
    supportingSourceUrls: supportingRefs(product),
    declineReason: "Under 9 years — outside typical publicly funded HPV program age range",
    naciVsHcGap: HPV_NACI_UNDER_9,
    naciNote: hpvNaciNote(input),
  });
}

function evaluateCervarix(input: CoverageInput): CoverageResult {
  const j = input.jurisdiction;
  const provUrl = HPV_PROVINCIAL[j];
  const support = supportingRefs("HpvCervarix");
  const gap = hpvNaciGap(input);
  const note = hpvNaciNote(input);

  if (j === "QC") {
    return result({
      outcome: "not_covered",
      confidence: "medium",
      rationale: [
        "The Québec MSSS professional monograph describes the free school program using Gardasil 9 (VPH-9); Cervarix (VPH-2) is not the publicly funded routine product under that program.",
      ],
      primarySourceUrl: SOURCES.qcHpv,
      supportingSourceUrls: support,
      declineReason:
        "Québec's publicly funded routine HPV school program uses Gardasil 9, not Cervarix",
      naciVsHcGap: gap,
      naciNote: note,
    });
  }

  return result({
    outcome: "conditional",
    confidence: "medium",
    rationale: [
      `Most Canadian jurisdictions publicly supply Gardasil 9 for school-based HPV programs; Cervarix may require private purchase or exceptional coverage — confirm current ${JURISDICTION_LABEL[j]} listing.`,
    ],
    primarySourceUrl: provUrl,
    supportingSourceUrls: support,
    missingInformation: [
      "Confirm whether Cervarix is publicly funded for this patient (many programs use Gardasil 9 only)",
    ],
    naciVsHcGap: gap,
    naciNote: note,
  });
}

function evaluateGardasil(input: CoverageInput): CoverageResult {
  const j = input.jurisdiction;
  const age = input.ageYears;
  const provUrl = HPV_PROVINCIAL[j];
  const place = JURISDICTION_LABEL[j];
  const cond = input.conditionIds;
  const support = supportingRefs("HpvGardasil");
  const gap = hpvNaciGap(input);
  const note = hpvNaciNote(input);

  const early = underNineNotFunded(age, provUrl, "HpvGardasil", input);
  if (early) return early;

  switch (j) {
    case "BC": {
      if (age <= 26) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "HealthLink BC states the HPV vaccine is free for all people in B.C. ages 9 to 26 (grade 6 school program; catch-up through pharmacy, public health, or primary care).",
          ],
          primarySourceUrl: SOURCES.bcHpv,
          supportingSourceUrls: support,
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "HealthLink BC describes publicly funded HPV vaccine for ages 9–26; patient is older than 26.",
        ],
        primarySourceUrl: SOURCES.bcHpv,
        supportingSourceUrls: support,
        declineReason: "Outside B.C.'s publicly funded HPV age band (9–26)",
      });
    }

    case "ON": {
      if (age >= 12 && age <= 18) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "Ontario.ca states HPV vaccine is free for students in grades 7–12; ages ~12–18 align with that secondary-school cohort (exact grade timing varies).",
          ],
          primarySourceUrl: SOURCES.onHpv,
          supportingSourceUrls: support,
        });
      }
      if (age >= 9 && age <= 11) {
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Ontario funds grades 7–12 cohorts; younger adolescents may qualify through catch-up — confirm with the local public health unit.",
          ],
          primarySourceUrl: SOURCES.onHpv,
          supportingSourceUrls: support,
          missingInformation: ["Confirm Ontario catch-up eligibility for ages 9–11"],
        });
      }
      if (age >= 19 && age <= 26) {
        if (isMsm(cond)) {
          return result({
            outcome: "covered",
            confidence: "high",
            rationale: [
              "Ontario publicly funds HPV vaccine for gay or bisexual males (GBMSM) up to 26 years of age.",
            ],
            primarySourceUrl: SOURCES.onHpv,
            supportingSourceUrls: support,
          });
        }
        return result({
          outcome: "not_covered",
          confidence: "medium",
          rationale: [
            "Ontario funds HPV vaccine for grades 7–12 cohorts and GBMSM up to age 26. This patient is past secondary school and the GBMSM criterion was not indicated.",
          ],
          primarySourceUrl: SOURCES.onHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "If patient is gay, bisexual, or MSM, select that criterion to confirm publicly funded eligibility",
          ],
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "Ontario publicly funds HPV vaccine primarily for grades 7–12 and selected additional cohorts (e.g. gay/bisexual males up to 26); typical adults outside those criteria purchase vaccine privately.",
        ],
        primarySourceUrl: SOURCES.onHpv,
        supportingSourceUrls: support,
        declineReason:
          "Outside Ontario's usual publicly funded HPV cohorts described on Ontario.ca",
      });
    }

    case "AB": {
      if (age <= 26) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "Alberta Health Services materials describe publicly funded HPV-9 through grade 6/9 school programs and catch-up at no charge through age 26 if not received in school.",
          ],
          primarySourceUrl: SOURCES.abHpv,
          supportingSourceUrls: support,
        });
      }
      return result({
        outcome: "conditional",
        confidence: "medium",
        rationale: [
          "Alberta lists publicly funded HPV vaccine through age 26 for those who missed school doses; older ages may require private pay or special eligibility — verify current AHS criteria.",
        ],
        primarySourceUrl: SOURCES.abHpv,
        supportingSourceUrls: support,
        missingInformation: ["Confirm transplant/CAR-T or other expanded eligibility if applicable"],
      });
    }

    case "SK": {
      if (age <= 26) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "The Saskatchewan Cancer Agency states residents can receive HPV vaccine free through Public Health until age 27 (i.e. through 26 years of age).",
          ],
          primarySourceUrl: SOURCES.skHpv,
          supportingSourceUrls: support,
        });
      }
      return result({
        outcome: "conditional",
        confidence: "medium",
        rationale: [
          "Saskatchewan describes publicly funded HPV vaccine through age 26; ages 27–45 may access vaccine through providers with possible insurance or out-of-pocket cost.",
        ],
        primarySourceUrl: SOURCES.skHpv,
        supportingSourceUrls: support,
        missingInformation: ["Confirm funding if immunocompromised or other special criteria"],
      });
    }

    case "NT": {
      if (age <= 26) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "NWT Health and Social Services states the HPV vaccine is free for everyone between ages 9 and 26, typically delivered in grades 4–6.",
          ],
          primarySourceUrl: SOURCES.ntHpv,
          supportingSourceUrls: support,
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "NWT describes publicly funded HPV vaccine for ages 9–26; patient is older than 26.",
        ],
        primarySourceUrl: SOURCES.ntHpv,
        supportingSourceUrls: support,
        declineReason: "Outside NWT publicly funded HPV age range (9–26)",
      });
    }

    case "NS": {
      if (age < 19) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "Nova Scotia Health states youth are eligible for publicly funded HPV vaccine until their 19th birthday (school-based program and catch-up).",
          ],
          primarySourceUrl: SOURCES.nsHpv,
          supportingSourceUrls: support,
        });
      }
      // Adults 19–45: NS funds Two-Spirit, transgender, and MSM — male sex is required
      // for the documented priority-population pathway; females outside the under-19
      // cohort are not described as a funded adult group.
      if (age <= 45 && input.biologicalSex === "male") {
        if (isMsm(cond)) {
          return result({
            outcome: "covered",
            confidence: "high",
            rationale: [
              "Nova Scotia Health publicly funds HPV vaccine for Two-Spirit, transgender people, and men who have sex with men until age 46.",
            ],
            primarySourceUrl: SOURCES.nsHpv,
            supportingSourceUrls: support,
          });
        }
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Nova Scotia Health notes Two-Spirit, transgender people, and men who have sex with men may receive free HPV vaccine until age 46.",
          ],
          primarySourceUrl: SOURCES.nsHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "Confirm patient meets NS priority-population criteria (Two-Spirit, transgender, or MSM pathway)",
          ],
        });
      }
      if (age <= 45 && input.biologicalSex === "female") {
        return result({
          outcome: "not_covered",
          confidence: "medium",
          rationale: [
            "Nova Scotia publicly funds HPV vaccine for youth under 19; the adult priority-population pathway (up to age 46) is described for Two-Spirit, transgender, and MSM individuals.",
          ],
          primarySourceUrl: SOURCES.nsHpv,
          supportingSourceUrls: support,
          declineReason: "Outside Nova Scotia's publicly funded HPV cohorts for adult females",
        });
      }
      if (age <= 45) {
        // Sex not provided — flag both possibilities
        return result({
          outcome: "conditional",
          confidence: "low",
          rationale: [
            "Nova Scotia publicly funds HPV vaccine for youth under 19 and for Two-Spirit, transgender, and MSM individuals up to age 46. Adult eligibility depends on sex and identity criteria.",
          ],
          primarySourceUrl: SOURCES.nsHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "Provide patient sex and confirm NS priority-population eligibility (Two-Spirit, transgender, or MSM)",
          ],
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "Nova Scotia publicly funds HPV vaccine for youth under 19 and stated priority populations up to 46; patient is outside those cohorts.",
        ],
        primarySourceUrl: SOURCES.nsHpv,
        supportingSourceUrls: support,
        declineReason: "Outside Nova Scotia's described publicly funded HPV cohorts",
      });
    }

    case "NB": {
      const birthYear = new Date().getFullYear() - age;
      if (age >= 9 && age <= 26) {
        if (input.biologicalSex === "female") {
          return result({
            outcome: "covered",
            confidence: "high",
            rationale: [
              "New Brunswick (gnb.ca) lists publicly funded HPV vaccine for females aged 9–26.",
            ],
            primarySourceUrl: SOURCES.nbHpv,
            supportingSourceUrls: support,
          });
        }
        if (input.biologicalSex === "male") {
          if (birthYear >= 2005) {
            return result({
              outcome: "covered",
              confidence: "high",
              rationale: [
                "New Brunswick lists publicly funded HPV vaccine for males aged 9–26 born on or after 2005.",
              ],
              primarySourceUrl: SOURCES.nbHpv,
              supportingSourceUrls: support,
            });
          }
          // Male born before 2005 — may still qualify via GBMSM or immunocompromised pathway
          return result({
            outcome: "conditional",
            confidence: "medium",
            rationale: [
              `New Brunswick's routine male HPV program covers those born on or after 2005 (estimated birth year for this patient: ${birthYear}). GBMSM or immunocompromised pathways may still apply.`,
            ],
            primarySourceUrl: SOURCES.nbHpv,
            supportingSourceUrls: support,
            missingInformation: ["Confirm GBMSM or immunocompromised eligibility for males born before 2005"],
          });
        }
        // Sex not provided
        return result({
          outcome: "covered",
          confidence: "medium",
          rationale: [
            "New Brunswick lists publicly funded HPV vaccine for females 9–26 and males 9–26 born on or after 2005. Confirm sex and birth year to determine eligibility.",
          ],
          primarySourceUrl: SOURCES.nbHpv,
          supportingSourceUrls: support,
          missingInformation: ["Provide patient sex to confirm NB eligibility (male birth year restriction applies)"],
        });
      }
      if (age >= 18 && age <= 45) {
        if (isMsm(cond) || isImmunocompromised(cond)) {
          return result({
            outcome: "covered",
            confidence: "high",
            rationale: [
              "New Brunswick publicly funds HPV vaccine for GBMSM and immunocompromised adults (including HIV) up to age 45.",
            ],
            primarySourceUrl: SOURCES.nbHpv,
            supportingSourceUrls: support,
          });
        }
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "New Brunswick funds GBMSM and immunocompromised adults including HIV up to age 45 under stated criteria.",
          ],
          primarySourceUrl: SOURCES.nbHpv,
          supportingSourceUrls: support,
          missingInformation: ["Confirm GBMSM or immunocompromised pathway using the eligibility criterion field"],
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "New Brunswick HPV funding focuses on ages 9–26 (with male birth-year rules) and selected adult priority groups to 45.",
        ],
        primarySourceUrl: SOURCES.nbHpv,
        supportingSourceUrls: support,
        declineReason: "Outside New Brunswick's described publicly funded HPV cohorts",
      });
    }

    case "QC": {
      if (age >= 9 && age <= 20) {
        return result({
          outcome: "covered",
          confidence: "high",
          rationale: [
            "The Québec MSSS PIQ states the free HPV vaccination program targets youth 9–20 years with Gardasil 9 (including grade 4 primary cohort).",
          ],
          primarySourceUrl: SOURCES.qcHpv,
          supportingSourceUrls: support,
        });
      }
      if (age >= 21 && age <= 45 && qcImmunocompromisedForHpv(cond)) {
        return result({
          outcome: "covered",
          confidence: "medium",
          rationale: [
            "Per the Québec MSSS PIQ, Gardasil 9 may be publicly funded for immunocompromised or HIV-infected adults 21–45 years when clinical criteria in that document are met.",
          ],
          primarySourceUrl: SOURCES.qcHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "Confirm HIV status or immunocompromise documentation with the treating clinician",
          ],
        });
      }
      if (age >= 21 && age <= 26) {
        if (isMsm(cond)) {
          return result({
            outcome: "covered",
            confidence: "high",
            rationale: [
              "Québec MSSS PIQ lists HARSAH (MSM/gay/bisexual men) as a publicly funded Gardasil 9 cohort up to age 26.",
            ],
            primarySourceUrl: SOURCES.qcHpv,
            supportingSourceUrls: support,
          });
        }
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Québec lists HARSAH (MSM) vaccination to 26 years and immunocompromised/HIV pathways to 45 years — verify cohort.",
          ],
          primarySourceUrl: SOURCES.qcHpv,
          supportingSourceUrls: support,
          missingInformation: ["Confirm HARSAH (MSM) or immunocompromised/HIV eligibility"],
        });
      }
      if (age >= 21 && age <= 45) {
        return result({
          outcome: "not_covered",
          confidence: "medium",
          rationale: [
            "Québec's routine free program for Gardasil 9 is primarily 9–20 years; adults 21–45 require immunocompromise/HIV or other stated pathways.",
          ],
          primarySourceUrl: SOURCES.qcHpv,
          supportingSourceUrls: support,
          declineReason:
            "Outside Québec's routine 9–20 program without documented immunocompromised/HIV pathway",
        });
      }
      return result({
        outcome: "not_covered",
        confidence: "medium",
        rationale: [
          "Patient is outside the Québec MSSS age bands described for publicly funded Gardasil 9 (verify exceptions with MSSS/CISSS).",
        ],
        primarySourceUrl: SOURCES.qcHpv,
        supportingSourceUrls: support,
        declineReason: "Outside described Québec publicly funded Gardasil 9 cohorts",
      });
    }

    case "NL":
      if (age <= 26) {
        return result({
          outcome: "covered",
          confidence: "medium",
          rationale: [
            "Newfoundland and Labrador immunization materials describe publicly funded HPV vaccine in school (grade 6) and catch-up through Public Health for those who missed doses.",
          ],
          primarySourceUrl: SOURCES.nlHpv,
          supportingSourceUrls: support,
          missingInformation: ["Confirm current NL Health catch-up age limits with Public Health"],
        });
      }
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Catch-up funding beyond typical adolescent ages must be confirmed with Newfoundland and Labrador Health.",
        ],
        primarySourceUrl: SOURCES.nlHpv,
        supportingSourceUrls: support,
        missingInformation: ["Verify adult NL publicly funded HPV eligibility"],
      });

    case "MB":
    case "PE":
      return noEncodedProvincialProgramResult({
        jurisdictionDisplayName: place,
        productLabel: "HPV vaccine (Gardasil)",
        primarySourceUrl: provUrl,
      });

    case "NU": {
      // Source: Government of Nunavut public-service announcement, Aug 2013
      // (gov.nu.ca) — Grade 6 girls offered HPV vaccine free in schools.
      // Grade 6 ≈ age 11–12. Program may have expanded since; verify with local health centre.
      if (age >= 9 && age <= 18 && input.biologicalSex === "female") {
        return result({
          outcome: "conditional",
          confidence: "low",
          rationale: [
            "A 2013 Government of Nunavut announcement describes HPV vaccine offered free to Grade 6 girls (approximately age 11–12) in schools across the territory. Program scope and any catch-up eligibility should be confirmed with the local health centre, as the document predates recent national expansions.",
          ],
          primarySourceUrl: provUrl,
          supportingSourceUrls: support,
          missingInformation: [
            "Confirm current Nunavut HPV program eligibility (grade and catch-up age range) with the local health centre",
          ],
        });
      }
      if (age >= 9 && age <= 18 && !input.biologicalSex) {
        return result({
          outcome: "conditional",
          confidence: "low",
          rationale: [
            "A 2013 Government of Nunavut announcement describes HPV vaccine offered free to Grade 6 girls. Whether coverage has since expanded to all sexes is not confirmed — verify with the local health centre.",
          ],
          primarySourceUrl: provUrl,
          supportingSourceUrls: support,
          missingInformation: [
            "Provide patient sex and confirm current Nunavut HPV program eligibility with the local health centre",
          ],
        });
      }
      return noEncodedProvincialProgramResult({
        jurisdictionDisplayName: "Nunavut",
        productLabel: "HPV vaccine (Gardasil)",
        primarySourceUrl: provUrl,
      });
    }

    case "YT":
      return result({
        outcome: "covered",
        confidence: "medium",
        rationale: [
          "Yukon delivers school-based immunization in grades 6 and 9; territorial programs typically align with national 9-valent HPV schedules — confirm cohort with Yukon Immunization.",
        ],
        primarySourceUrl: SOURCES.ytHpv,
        supportingSourceUrls: support,
        missingInformation: ["Confirm grade cohort and catch-up rules on Yukon Immunization"],
      });

    default:
      return noEncodedProvincialProgramResult({
        jurisdictionDisplayName: place,
        productLabel: "HPV vaccine (Gardasil)",
        primarySourceUrl: provUrl,
      });
  }
}

export function evaluateHpv(input: CoverageInput): CoverageResult {
  const product = input.product as HpvProduct;
  const raw = product === "HpvCervarix"
    ? evaluateCervarix(input)
    : evaluateGardasil(input);

  // Ensure every HPV result carries the NACI gap/note. Individual branches
  // may already set these (e.g. Cervarix, under-9); the fallback fills any
  // that were missed without overwriting explicit values.
  return {
    ...raw,
    naciVsHcGap: raw.naciVsHcGap ?? hpvNaciGap(input),
    naciNote: raw.naciNote ?? hpvNaciNote(input),
  };
}
