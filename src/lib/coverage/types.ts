export type Jurisdiction =
  | "ON"
  | "QC"
  | "NS"
  | "AB"
  | "BC"
  | "MB"
  | "NB"
  | "NL"
  | "PE"
  | "SK"
  | "NT"
  | "NU"
  | "YT";

export type RsvProduct = "Abrysvo" | "Arexvy" | "Beyfortus";

export type ShinglesProduct = "Shingrix";

export type VaccineProduct = RsvProduct | ShinglesProduct;

export type CoverageOutcome = "covered" | "not_covered" | "conditional";

export type Confidence = "high" | "medium" | "low";

export type ConditionId =
  | "chronic_lung_prematurity"
  | "lct_retirement_resident"
  | "alc_hospital"
  | "gn_immunocompromised"
  | "dialysis"
  | "transplant"
  | "homeless"
  | "indigenous"
  | "immunocompromised_shingles";

/**
 * Structured comparison of Health Canada's approved indication vs NACI
 * recommendation strength. Drives the visual gap card in the UI.
 */
export interface NaciVsHcGap {
  /** Short label for what Health Canada has approved */
  hcIndication: string;
  /** Short label for the NACI grade and scope */
  naciGrade: string;
  /** Whether HC and NACI are fully aligned, partially aligned, or divergent */
  alignment: "full" | "partial" | "gap";
  /** One-line plain-language explanation when not fully aligned */
  gapDetail?: string;
}

export interface CoverageInput {
  jurisdiction: Jurisdiction;
  product: VaccineProduct;
  ageYears: number;
  ageMonths?: number;
  pregnant?: boolean;
  gestationalWeeks?: number;
  deliverDuringRsvSeason?: boolean;
  previouslyReceivedPublicAdultRsv?: boolean;
  pediatricSpecialistDiscussed?: boolean;
  conditionIds: ConditionId[];
  /**
   * When true, GreenShield "gap" messaging funds only where NACI is a strong
   * recommendation (Grade A) and the province does not pay. When false, gap
   * follows Health Canada on-label indication minus provincial coverage.
   */
  considerNaci?: boolean;
}

export interface CoverageResult {
  outcome: CoverageOutcome;
  confidence: Confidence;
  rationale: string[];
  primarySourceUrl: string;
  supportingSourceUrls?: string[];
  dispensingContext?: string;
  missingInformation?: string[];
  declineReason?: string;
  naciNote?: string;
  coverageGap?: string;
  /** Structured HC vs NACI comparison for the visual gap card. */
  naciVsHcGap?: NaciVsHcGap;
  /** When the public program funds the dose, plans typically should not duplicate pay. */
  publicProgramPayerNote?: string;
}
