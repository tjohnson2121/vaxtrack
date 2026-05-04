import type { CoverageResult } from "./types";

/**
 * Used when no provincial program rules or dedicated source are modeled for this
 * jurisdiction + vaccine (see evaluate.ts RSV branches, evaluate-shingles NB/NT/NU).
 */
export function noEncodedProvincialProgramResult(args: {
  jurisdictionDisplayName: string;
  productLabel: string;
  primarySourceUrl: string;
}): CoverageResult {
  return {
    outcome: "no_data",
    confidence: "low",
    rationale: [
      `No provincial program eligibility criteria are encoded for ${args.productLabel} in ${args.jurisdictionDisplayName}. Use the primary source link to review current program eligibility.`,
    ],
    primarySourceUrl: args.primarySourceUrl,
  };
}
