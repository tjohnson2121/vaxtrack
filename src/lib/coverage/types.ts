export type Jurisdiction = "ON" | "QC" | "NS";

export type RsvProduct = "Abrysvo" | "Arexvy" | "Beyfortus";

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
  | "indigenous";

export interface CoverageInput {
  jurisdiction: Jurisdiction;
  product: RsvProduct;
  ageYears: number;
  ageMonths?: number;
  pregnant?: boolean;
  gestationalWeeks?: number;
  deliverDuringRsvSeason?: boolean;
  previouslyReceivedPublicAdultRsv?: boolean;
  pediatricSpecialistDiscussed?: boolean;
  conditionIds: ConditionId[];
  /**
   * When true, GreenShield “gap” messaging funds only where NACI is a strong
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
  /** When the public program funds the dose, plans typically should not duplicate pay. */
  publicProgramPayerNote?: string;
}
