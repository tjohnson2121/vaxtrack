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
}
