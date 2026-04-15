import { z } from "zod";

export const conditionIdZ = z.enum([
  "chronic_lung_prematurity",
  "lct_retirement_resident",
  "alc_hospital",
  "gn_immunocompromised",
  "dialysis",
  "transplant",
  "homeless",
  "indigenous",
  "immunocompromised_shingles",
]);

export const whenClauseZ = z
  .object({
    minAgeYears: z.number().optional(),
    maxAgeYears: z.number().optional(),
    minAgeMonths: z.number().optional(),
    maxAgeMonths: z.number().optional(),
    pregnant: z.boolean().optional(),
    gestationalWeeksMin: z.number().optional(),
    gestationalWeeksMax: z.number().optional(),
    deliverDuringRsvSeason: z.boolean().optional(),
    previouslyReceivedPublicAdultRsv: z.boolean().optional(),
    pediatricSpecialistDiscussed: z.boolean().optional(),
    anyConditions: z.array(conditionIdZ).optional(),
    allConditions: z.array(conditionIdZ).optional(),
  })
  .strict()
  .optional();

export const coverageRuleZ = z
  .object({
    id: z.string().min(1),
    priority: z.number(),
    jurisdiction: z.enum(["ON", "QC", "NS", "AB", "BC", "MB", "NB", "NL", "PE", "SK", "NT", "NU", "YT"]),
    products: z
      .array(z.enum(["Abrysvo", "Arexvy", "Beyfortus", "Shingrix"]))
      .min(1),
    when: whenClauseZ,
    outcome: z.enum(["covered", "not_covered", "conditional"]),
    confidence: z.enum(["high", "medium", "low"]),
    rationale: z.array(z.string()).min(1),
    primarySourceUrl: z.string().url(),
    supportingSourceUrls: z.array(z.string().url()).optional(),
    dispensingContext: z.string().optional(),
    missingInformation: z.array(z.string()).optional(),
  })
  .strict();

export const rulesDocumentZ = z
  .object({
    rules: z.array(coverageRuleZ).min(1),
  })
  .strict();

export type CoverageRuleParsed = z.infer<typeof coverageRuleZ>;
export type RulesDocumentParsed = z.infer<typeof rulesDocumentZ>;

export function parseRulesDocumentJson(json: string): {
  ok: true;
  data: RulesDocumentParsed;
} | {
  ok: false;
  error: string;
} {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Invalid JSON",
    };
  }
  const r = rulesDocumentZ.safeParse(raw);
  if (!r.success) {
    return { ok: false, error: r.error.flatten().toString() };
  }
  return { ok: true, data: r.data };
}

/** Strip optional ```json fences from model output. */
export function extractJsonObjectFromModelText(text: string): string {
  const t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) return fence[1].trim();
  return t;
}
