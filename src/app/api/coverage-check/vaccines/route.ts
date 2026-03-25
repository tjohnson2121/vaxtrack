import { NextResponse } from "next/server";
import { listVaccinesWithPublishedRuleSets } from "@/lib/server/coverage-rule-queries";

export const runtime = "nodejs";

export async function GET() {
  const list = await listVaccinesWithPublishedRuleSets();
  return NextResponse.json(list);
}
