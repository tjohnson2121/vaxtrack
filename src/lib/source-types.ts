/** Tags for vaccine data sources (extend as provinces/products grow). */
export const SOURCE_TYPES = [
  { value: "ON", label: "Ontario (provincial)" },
  { value: "QC", label: "Quebec (MSSS / provincial)" },
  { value: "NS", label: "Nova Scotia (provincial)" },
  { value: "AB", label: "Alberta (provincial)" },
  { value: "BC", label: "British Columbia (provincial)" },
  { value: "MB", label: "Manitoba (provincial)" },
  { value: "NB", label: "New Brunswick (provincial)" },
  { value: "NL", label: "Newfoundland and Labrador (provincial)" },
  { value: "PE", label: "PEI (provincial)" },
  { value: "SK", label: "Saskatchewan (provincial)" },
  { value: "NT", label: "Northwest Territories" },
  { value: "NU", label: "Nunavut" },
  { value: "YT", label: "Yukon" },
  { value: "NACI", label: "NACI / PHAC recommendation" },
  { value: "HC_MONOGRAPH", label: "Health Canada product monograph (PDF)" },
  { value: "HC_DPD", label: "Health Canada DPD / drug product DB" },
  { value: "OTHER", label: "Other / national / misc." },
] as const;

export type SourceTypeValue = (typeof SOURCE_TYPES)[number]["value"];

export function isValidSourceType(v: string): v is SourceTypeValue {
  return SOURCE_TYPES.some((t) => t.value === v);
}
