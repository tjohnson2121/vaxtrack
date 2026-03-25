import { desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  vaccines,
  vaccineSources,
  sourceSnapshots,
  proposedRules,
} from "@/db/schema";
import type { VaccineWithSources } from "@/lib/vaccine-tree-types";

export async function getVaccinesWithSourcesAndLatestSnapshot(): Promise<
  VaccineWithSources[]
> {
  const db = getDb();
  const vList = await db
    .select()
    .from(vaccines)
    .orderBy(desc(vaccines.createdAt));
  const allSources = await db.select().from(vaccineSources);
  const allSnapshots = await db
    .select()
    .from(sourceSnapshots)
    .orderBy(desc(sourceSnapshots.fetchedAt));

  const latestBySourceId = new Map<string, (typeof allSnapshots)[0]>();
  for (const s of allSnapshots) {
    if (!latestBySourceId.has(s.vaccineSourceId)) {
      latestBySourceId.set(s.vaccineSourceId, s);
    }
  }

  return vList.map((v) => ({
    id: v.id,
    name: v.name,
    createdAt: v.createdAt,
    sources: allSources
      .filter((s) => s.vaccineId === v.id)
      .map((s) => ({
        id: s.id,
        vaccineId: s.vaccineId,
        url: s.url,
        sourceType: s.sourceType,
        createdAt: s.createdAt,
        latestSnapshot: latestBySourceId.get(s.id) ?? null,
      })),
  })) satisfies VaccineWithSources[];
}

export async function getProposedRulesForVaccine(vaccineId: string) {
  const db = getDb();
  return db
    .select()
    .from(proposedRules)
    .where(eq(proposedRules.vaccineId, vaccineId))
    .orderBy(desc(proposedRules.updatedAt));
}
