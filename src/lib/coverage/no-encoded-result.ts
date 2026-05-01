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
      `No linked provincial program source or eligibility summary for ${args.productLabel} in ${args.jurisdictionDisplayName} (e.g. Yukon · Beyfortus has no source).`,
    ],
    primarySourceUrl: args.primarySourceUrl,
  };
}
