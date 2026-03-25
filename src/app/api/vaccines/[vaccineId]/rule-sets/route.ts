import { NextResponse } from "next/server";
import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coverageRuleSets } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ vaccineId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  const db = getDb();
  const rows = await db
    .select({
      id: coverageRuleSets.id,
      vaccineId: coverageRuleSets.vaccineId,
      sourceSnapshotId: coverageRuleSets.sourceSnapshotId,
      status: coverageRuleSets.status,
      extractor: coverageRuleSets.extractor,
      model: coverageRuleSets.model,
      promptVersion: coverageRuleSets.promptVersion,
      createdAt: coverageRuleSets.createdAt,
      updatedAt: coverageRuleSets.updatedAt,
      publishedAt: coverageRuleSets.publishedAt,
    })
    .from(coverageRuleSets)
    .where(eq(coverageRuleSets.vaccineId, vaccineId))
    .orderBy(desc(coverageRuleSets.createdAt));

  return NextResponse.json(rows);
}
