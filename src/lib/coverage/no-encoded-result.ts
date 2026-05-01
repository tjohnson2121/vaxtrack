import type { CoverageResult } from "./types";

/**
 * Provincial program rules are not modeled for this jurisdiction/product.
 * Deliberately omits gap/recommendation fields so the UI does not imply coverage guidance.
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
      `Confirm ${args.productLabel} eligibility and public funding in ${args.jurisdictionDisplayName} using the linked provincial or territorial immunization source.`,
    ],
    primarySourceUrl: args.primarySourceUrl,
    missingInformation: [
      `Confirm eligibility using current ${args.jurisdictionDisplayName} immunization or pharmacy program sources.`,
    ],
  };
}
