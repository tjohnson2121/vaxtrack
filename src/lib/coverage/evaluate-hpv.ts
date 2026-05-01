/**
 * HPV eligibility logic derived from official provincial/territorial pages (April 2026 snapshot:
 * Ontario.ca, HealthLink BC, NS Health, NB gnb.ca, MSSS Québec PIQ, Sask Cancer Agency,
 * NWT HSS, Alberta MyHealth Alberta, NL partnership summary). MB / PE / NU rely on PDFs —
 * rationale directs users to the linked provincial documents.
 */

import type {
  ConditionId,
  CoverageInput,
  CoverageResult,
  HpvProduct,
  Jurisdiction,
} from "./types";
import { SOURCES } from "./sources";

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

function qcImmunocompromisedForHpv(c: ConditionId[]): boolean {
  return c.some((x) =>
    ["gn_immunocompromised", "dialysis", "transplant"].includes(x)
  );
}

function underNineNotFunded(
  age: number,
  provUrl: string,
  product: HpvProduct
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
  });
}

function evaluateCervarix(input: CoverageInput): CoverageResult {
  const j = input.jurisdiction;
  const provUrl = HPV_PROVINCIAL[j];
  const support = supportingRefs("HpvCervarix");

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
  });
}

function evaluateGardasil(input: CoverageInput): CoverageResult {
  const j = input.jurisdiction;
  const age = input.ageYears;
  const provUrl = HPV_PROVINCIAL[j];
  const place = JURISDICTION_LABEL[j];
  const cond = input.conditionIds;
  const support = supportingRefs("HpvGardasil");

  const early = underNineNotFunded(age, provUrl, "HpvGardasil");
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
          naciNote:
            "NACI recommendations on HPV vaccines are summarized in the linked PHAC PDF and HTML documents.",
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
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Ontario notes gay or bisexual males up to 26 years of age may receive publicly funded HPV vaccine; others past secondary school usually pay privately unless another program criterion applies.",
          ],
          primarySourceUrl: SOURCES.onHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "Confirm Ontario eligibility for this patient (e.g. GBMSM pathway vs private purchase)",
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
      if (age <= 45) {
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Nova Scotia Health notes Two-Spirit, transgender people and men who have sex with men may receive free vaccine until age 46; others in this age band may need private purchase.",
          ],
          primarySourceUrl: SOURCES.nsHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "Confirm eligibility under NS priority-population criteria vs private pay",
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
      if (age >= 9 && age <= 26) {
        return result({
          outcome: "covered",
          confidence: "medium",
          rationale: [
            "New Brunswick (gnb.ca) lists publicly funded HPV vaccine for females aged 9–26 and males aged 9–26 born on or after 2005, with further pathways for priority adults — male eligibility depends on birth year and stated risk cohorts.",
          ],
          primarySourceUrl: SOURCES.nbHpv,
          supportingSourceUrls: support,
          missingInformation: [
            "Confirm male birth year (on or after 2005) and whether GBMSM or immunocompromised expanded eligibility applies",
          ],
        });
      }
      if (age >= 18 && age <= 45) {
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "New Brunswick funds GBMSM and immunocompromised adults including HIV up to age 45 under stated criteria.",
          ],
          primarySourceUrl: SOURCES.nbHpv,
          supportingSourceUrls: support,
          missingInformation: ["Confirm GBMSM or immunocompromised pathway documentation"],
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
        return result({
          outcome: "conditional",
          confidence: "medium",
          rationale: [
            "Québec lists HARSAH (MSM) vaccination to 26 years and immunocompromised/HIV pathways to 45 years — verify cohort.",
          ],
          primarySourceUrl: SOURCES.qcHpv,
          supportingSourceUrls: support,
          missingInformation: ["Confirm HARSAH or immunocompromised/HIV eligibility"],
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
    case "NU":
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          `Confirm funded HPV age cohorts, product, and catch-up rules for ${place} using the linked provincial immunization resource (fact sheet or program manual).`,
        ],
        primarySourceUrl: provUrl,
        supportingSourceUrls: support,
        missingInformation: [
          `Verify HPV program eligibility on the official ${place} immunization resource`,
        ],
      });

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
      return result({
        outcome: "conditional",
        confidence: "low",
        rationale: [
          "Confirm HPV eligibility using the linked provincial or territorial immunization source.",
        ],
        primarySourceUrl: provUrl,
        supportingSourceUrls: support,
      });
  }
}

export function evaluateHpv(input: CoverageInput): CoverageResult {
  const product = input.product as HpvProduct;
  if (product === "HpvCervarix") {
    return evaluateCervarix(input);
  }
  return evaluateGardasil(input);
}
