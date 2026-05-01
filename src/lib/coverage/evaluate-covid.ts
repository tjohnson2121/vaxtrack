import type { CovidProduct, CoverageInput, CoverageResult, Jurisdiction } from "./types";
import { SOURCES } from "./sources";

const COVID_MONOGRAPH: Record<CovidProduct, string> = {
  CovidSpikevax: SOURCES.hcCovidSpikevax,
  CovidMNEXSPIKE: SOURCES.hcCovidMNEXSPIKE,
  CovidNUVAXOVID: SOURCES.hcCovidNUVAXOVID,
};

const COVID_PROVINCIAL: Record<Jurisdiction, string> = {
  AB: SOURCES.abCovid,
  BC: SOURCES.bcCovid,
  MB: SOURCES.mbCovid,
  NB: SOURCES.nbCovid,
  NL: SOURCES.nlCovid,
  NS: SOURCES.nsCovid,
  NT: SOURCES.ntCovid,
  NU: SOURCES.nuCovid,
  ON: SOURCES.onCovid,
  PE: SOURCES.peCovid,
  QC: SOURCES.qcCovid,
  SK: SOURCES.skCovid,
  YT: SOURCES.ytCovid,
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

/** Minimum age (months) aligned with Ontario MOH and typical provincial seasonal COVID programs. */
const PUBLIC_PROGRAM_MIN_MONTHS = 6;

function result(
  partial: Omit<CoverageResult, "primarySourceUrl"> & { primarySourceUrl?: string }
): CoverageResult {
  return {
    primarySourceUrl: partial.primarySourceUrl ?? SOURCES.onCovid,
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

function totalAgeMonths(input: CoverageInput): number | "unknown" {
  const y = input.ageYears;
  const m = input.ageMonths;
  if (Number.isNaN(y) || y < 0) return "unknown";
  if (m !== undefined && !Number.isNaN(m)) {
    return y * 12 + m;
  }
  return y * 12;
}

function infantMonthsMissing(input: CoverageInput): boolean {
  return (
    input.ageYears === 0 &&
    (input.ageMonths === undefined || Number.isNaN(input.ageMonths as number))
  );
}

function underPublicMinimumAge(input: CoverageInput): boolean {
  const t = totalAgeMonths(input);
  if (t === "unknown") return true;
  return t < PUBLIC_PROGRAM_MIN_MONTHS;
}

function supportingRefs(product: CovidProduct, j: Jurisdiction): string[] {
  const monoUrl = COVID_MONOGRAPH[product];
  const urls = [
    monoUrl,
    SOURCES.naciCovidPdf,
    SOURCES.naciCovidSummaryHtml,
    SOURCES.cigCovid,
    SOURCES.covidCoverageInfobase,
    SOURCES.cdcCovidStayCurrent,
  ];
  if (j === "YT") urls.push(SOURCES.ytCovidFactSheet);
  return urls;
}

/**
 * Encoded COVID-19 public-program logic from official provincial/national sources.
 * Ontario: MOH HCP fact sheet Sept 2025 (product formulary + minimum age 6 months).
 * Other jurisdictions: age gate + provincial page; territories emphasize verification.
 */
export function evaluateCovid(input: CoverageInput): CoverageResult {
  const j = input.jurisdiction;
  const product = input.product as CovidProduct;
  const provUrl = COVID_PROVINCIAL[j];
  const place = JURISDICTION_LABEL[j];
  const supporting = supportingRefs(product, j);

  if (infantMonthsMissing(input)) {
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Age under 1 year requires completed months to verify the usual minimum age (about 6 months) for publicly funded seasonal COVID-19 vaccination.",
      ],
      primarySourceUrl: provUrl,
      supportingSourceUrls: supporting,
      missingInformation: ["Enter age in months for infants under 1 year"],
    });
  }

  if (underPublicMinimumAge(input)) {
    return result({
      outcome: "not_covered",
      confidence: "high",
      rationale: [
        `${place}'s COVID-19 immunization program follows schedules that generally begin at ${PUBLIC_PROGRAM_MIN_MONTHS} months of age for seasonal vaccination — this patient is under that threshold.`,
      ],
      primarySourceUrl: provUrl,
      supportingSourceUrls: supporting,
      declineReason: `Under ${PUBLIC_PROGRAM_MIN_MONTHS} months — outside typical publicly funded seasonal COVID-19 program age`,
    });
  }

  // ─── Ontario (MOH HCP fact sheet: Spikevax + Comirnaty supplied; Nuvaxovid not supplied 2025/26) ───
  if (j === "ON") {
    if (product === "CovidNUVAXOVID") {
      return result({
        outcome: "not_covered",
        confidence: "high",
        rationale: [
          "Ontario's 2025/2026 MOH COVID-19 vaccine program does not supply Novavax Nuvaxovid — only Moderna Spikevax and Pfizer-BioNTech Comirnaty are listed for this respiratory season.",
        ],
        primarySourceUrl: SOURCES.onCovidMohHcpFactSheet2025,
        supportingSourceUrls: [SOURCES.onCovid, ...supporting],
        declineReason:
          "Novavax Nuvaxovid is not supplied under Ontario's 2025/26 public COVID-19 program",
      });
    }

    if (product === "CovidSpikevax") {
      return result({
        outcome: "covered",
        confidence: "high",
        rationale: [
          "Ontario lists Moderna Spikevax as a publicly funded COVID-19 vaccine for 2025/2026 with age-appropriate formats per MOH guidance.",
          "Confirm dose timing for the current respiratory season (priority vs general population waves — e.g. general population from Oct 27, 2025 per MOH schedules) and interval from any prior dose or infection.",
        ],
        primarySourceUrl: SOURCES.onCovidMohHcpFactSheet2025,
        supportingSourceUrls: [SOURCES.onCovid, ...supporting],
        missingInformation: [
          "Confirm booking wave / seasonal dose timing at Ontario's COVID-19 vaccine information",
          "Confirm interval since last COVID-19 dose or infection if applicable",
        ],
      });
    }

    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        "Ontario's published 2025/2026 program lists Moderna Spikevax and Pfizer-BioNTech Comirnaty as funded COVID-19 products — this selection is not named in that formulary document.",
        "Confirm whether this product/DIN is available under the public program or must be obtained outside provincial supply.",
      ],
      primarySourceUrl: SOURCES.onCovidMohHcpFactSheet2025,
      supportingSourceUrls: [SOURCES.onCovid, ...supporting],
      missingInformation: [
        "Verify product availability under Ontario's public COVID-19 program with pharmacy or public health",
      ],
    });
  }

  // ─── Territories (emphasize local logistics and supply) ───
  if (j === "NT" || j === "NU" || j === "YT") {
    return result({
      outcome: "conditional",
      confidence: "medium",
      rationale: [
        `${place}'s COVID-19 immunization page describes funded vaccination for residents who meet provincial age and program criteria (typically from about 6 months). Confirm which products are supplied, seasonal timing, and how to book at the territorial source.`,
      ],
      primarySourceUrl: provUrl,
      supportingSourceUrls: supporting,
      missingInformation: [
        `Confirm clinic access and formulations funded in ${place} for the current season`,
      ],
    });
  }

  // ─── Other provinces: Spikevax (standard mRNA in Canadian programs) ───
  if (product === "CovidSpikevax") {
    return result({
      outcome: "covered",
      confidence: "medium",
      rationale: [
        `${place} operates publicly funded seasonal COVID-19 vaccination for residents meeting provincial criteria; Moderna Spikevax is a commonly supplied authorized mRNA product — confirm the current provincial product list and eligibility tiers at the linked program page.`,
      ],
      primarySourceUrl: provUrl,
      supportingSourceUrls: supporting,
      missingInformation: [
        "Confirm seasonal eligibility (priority vs general population) and supply at the provincial source",
      ],
    });
  }

  // Alternate products (Novavax, other DINs): formulary varies by jurisdiction and season
  return result({
    outcome: "conditional",
    confidence: "medium",
    rationale: [
      `${place}'s public program may stock specific COVID-19 products each season — this product may or may not match provincial supply; confirm funded availability at the provincial COVID-19 vaccine page.`,
    ],
    primarySourceUrl: provUrl,
    supportingSourceUrls: supporting,
    missingInformation: [
      "Verify whether this product is publicly funded and available for the patient this season",
    ],
  });
}
