import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { coverageRuleSets } from "@/db/schema";
import { parseRulesDocumentJson } from "@/lib/rules/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ ruleSetId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { ruleSetId } = await ctx.params;
  const db = getDb();

  const [row] = await db
    .select()
    .from(coverageRuleSets)
    .where(eq(coverageRuleSets.id, ruleSetId));

  if (!row) {
    return NextResponse.json({ error: "Rule set not found" }, { status: 404 });
  }
  if (row.status !== "draft") {
    return NextResponse.json(
      { error: "Only draft rule sets can be published" },
      { status: 400 }
    );
  }

  const validated = parseRulesDocumentJson(row.rulesJson);
  if (!validated.ok) {
    return NextResponse.json(
      { error: `Invalid stored rules: ${validated.error}` },
      { status: 422 }
    );
  }

  const now = Date.now();
  db.transaction((tx) => {
    tx.update(coverageRuleSets)
      .set({ status: "archived", updatedAt: now })
      .where(
        and(
          eq(coverageRuleSets.vaccineId, row.vaccineId),
          eq(coverageRuleSets.status, "published")
        )
      )
      .run();
    tx.update(coverageRuleSets)
      .set({
        status: "published",
        publishedAt: now,
        updatedAt: now,
        validationErrors: null,
      })
      .where(eq(coverageRuleSets.id, ruleSetId))
      .run();
  });

  return NextResponse.json({
    id: ruleSetId,
    vaccineId: row.vaccineId,
    status: "published" as const,
    publishedAt: now,
    ruleCount: validated.data.rules.length,
  });
}
