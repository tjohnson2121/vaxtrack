import Anthropic from "@anthropic-ai/sdk";
import {
  extractJsonObjectFromModelText,
  parseRulesDocumentJson,
  type RulesDocumentParsed,
} from "@/lib/rules/schema";

export const RULES_PROMPT_VERSION = "anthropic-v1";

const SYSTEM = `You are a clinical policy extraction assistant for Canadian vaccine public funding programs.
Your job is to read source text (HTML-extracted or PDF-extracted) and output ONLY valid JSON (no markdown, no commentary).

Output shape MUST be exactly:
{"rules":[ ... ]}

Each rule object MUST have:
- id: string (unique slug, e.g. "on-adult-75-arexvy")
- priority: number (lower numbers are evaluated first; use 10, 20, 30... to leave gaps)
- jurisdiction: one of "ON","QC","NS" only
- products: non-empty array of "Abrysvo","Arexvy","Beyfortus","Shingrix","CovidSpikevax","CovidMNEXSPIKE","CovidNUVAXOVID","HpvGardasil","HpvCervarix"
- when: optional object with ONLY these optional keys as needed:
  minAgeYears, maxAgeYears, minAgeMonths, maxAgeMonths,
  pregnant (boolean),
  gestationalWeeksMin, gestationalWeeksMax (numbers),
  deliverDuringRsvSeason (boolean),
  previouslyReceivedPublicAdultRsv (boolean),
  pediatricSpecialistDiscussed (boolean),
  anyConditions (array of: chronic_lung_prematurity, lct_retirement_resident, alc_hospital, gn_immunocompromised, dialysis, transplant, homeless, indigenous),
  allConditions (same enum values)
- outcome: "covered" | "not_covered" | "conditional"
- confidence: "high" | "medium" | "low"
- rationale: string[] (plain-language bullets citing the source)
- primarySourceUrl: string (must be a valid URL; use the official source URL provided in the user message when applicable)
- supportingSourceUrls: optional string[]
- dispensingContext: optional string
- missingInformation: optional string[]

Rules are evaluated in ascending priority; first matching rule for jurisdiction+product+when wins.
Encode catch-all / fallback rules last with higher priority numbers.
If the text does not support a jurisdiction, do not invent rules for that jurisdiction.
Be conservative: use "conditional" and lower confidence when eligibility is unclear.`;

export type ExtractRulesParams = {
  vaccineName: string;
  sourceType: string;
  sourceUrl: string;
  snapshotText: string;
};

export type ExtractRulesResult =
  | { ok: true; data: RulesDocumentParsed; model: string }
  | { ok: false; error: string };

const MAX_SNAPSHOT_CHARS = 80_000;

export async function extractRulesWithAnthropic(
  params: ExtractRulesParams
): Promise<ExtractRulesResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey?.trim()) {
    return { ok: false, error: "ANTHROPIC_API_KEY is not set" };
  }

  const model =
    process.env.ANTHROPIC_RULES_MODEL?.trim() ||
    "claude-3-5-sonnet-20241022";

  const text =
    params.snapshotText.length > MAX_SNAPSHOT_CHARS
      ? params.snapshotText.slice(0, MAX_SNAPSHOT_CHARS) +
        "\n\n[TRUNCATED_FOR_MODEL_CONTEXT]"
      : params.snapshotText;

  const userMessage = `Vaccine: ${params.vaccineName}
Source type tag: ${params.sourceType}
Official source URL: ${params.sourceUrl}

--- SOURCE TEXT START ---
${text}
--- SOURCE TEXT END ---

Extract funding eligibility rules as JSON only. Use jurisdiction codes ON/QC/NS that match the source (e.g. Ontario program → ON). primarySourceUrl should usually be "${params.sourceUrl}".`;

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model,
      max_tokens: 16_384,
      system: SYSTEM,
      messages: [{ role: "user", content: userMessage }],
    });

    const rawText = message.content
      .map((b) => (b.type === "text" ? b.text : ""))
      .join("\n");

    const jsonStr = extractJsonObjectFromModelText(rawText);
    const parsed = parseRulesDocumentJson(jsonStr);
    if (!parsed.ok) {
      return { ok: false, error: `Schema validation failed: ${parsed.error}` };
    }
    return { ok: true, data: parsed.data, model };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: msg };
  }
}
