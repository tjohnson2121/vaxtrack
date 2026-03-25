import { and, desc, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db";
import { coverageRuleSets, vaccines } from "@/db/schema";
import { parseRulesDocumentJson } from "@/lib/rules/schema";
import type { CoverageRuleParsed } from "@/lib/rules/schema";

export async function getPublishedRulesForVaccine(
  vaccineId: string
): Promise<CoverageRuleParsed[] | null> {
  const db = getDb();
  const [row] = await db
    .select()
    .from(coverageRuleSets)
    .where(
      and(
        eq(coverageRuleSets.vaccineId, vaccineId),
        eq(coverageRuleSets.status, "published")
      )
    )
    .orderBy(desc(coverageRuleSets.publishedAt))
    .limit(1);

  if (!row) return null;
  const parsed = parseRulesDocumentJson(row.rulesJson);
  if (!parsed.ok) return null;
  return parsed.data.rules;
}

export async function listVaccinesWithPublishedRuleSets(): Promise<
  { id: string; name: string }[]
> {
  const db = getDb();
  const published = await db
    .select({ vaccineId: coverageRuleSets.vaccineId })
    .from(coverageRuleSets)
    .where(eq(coverageRuleSets.status, "published"));
  const ids = [...new Set(published.map((r) => r.vaccineId))];
  if (ids.length === 0) return [];
  return db
    .select({ id: vaccines.id, name: vaccines.name })
    .from(vaccines)
    .where(inArray(vaccines.id, ids))
    .orderBy(vaccines.name);
}
