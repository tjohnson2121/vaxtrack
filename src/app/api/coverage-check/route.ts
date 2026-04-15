import { NextResponse } from "next/server";
import { evaluateCoverage, withPublicProgramPayerNote } from "@/lib/coverage/evaluate";
import type { CoverageInput } from "@/lib/coverage/types";
import { coverageCheckBodyZ } from "@/lib/server/coverage-check-body";
import { getPublishedRulesForVaccine } from "@/lib/server/coverage-rule-queries";
import { evaluateWithPublishedRules } from "@/lib/rules/evaluate-with-rules";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = coverageCheckBodyZ.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.flatten().toString() },
      { status: 400 }
    );
  }

  const b = parsed.data;
  const input: CoverageInput = {
    jurisdiction: b.jurisdiction,
    product: b.product,
    ageYears: b.ageYears,
    ageMonths: b.ageMonths,
    pregnant: b.pregnant,
    gestationalWeeks: b.gestationalWeeks,
    deliverDuringRsvSeason: b.deliverDuringRsvSeason,
    previouslyReceivedPublicAdultRsv: b.previouslyReceivedPublicAdultRsv,
    pediatricSpecialistDiscussed: b.pediatricSpecialistDiscussed,
    conditionIds: b.conditionIds,
    considerNaci: b.considerNaci,
  };

  if (b.vaccineId) {
    const rules = await getPublishedRulesForVaccine(b.vaccineId);
    if (rules && rules.length > 0) {
      const fromRules = evaluateWithPublishedRules(input, rules);
      if (fromRules) {
        return NextResponse.json({
          source: "published_rules" as const,
          result: withPublicProgramPayerNote(fromRules),
        });
      }
    }
  }

  return NextResponse.json({
    source: "builtin_fallback" as const,
    result: evaluateCoverage(input),
  });
}
