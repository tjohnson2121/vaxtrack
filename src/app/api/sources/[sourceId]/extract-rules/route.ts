import { NextResponse } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "@/db";
import {
  coverageRuleSets,
  sourceSnapshots,
  vaccineSources,
  vaccines,
} from "@/db/schema";
import {
  extractRulesWithAnthropic,
  RULES_PROMPT_VERSION,
} from "@/lib/llm/extract-rules-anthropic";

export const runtime = "nodejs";

const EXTRACTOR_ID = "anthropic-v1";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function POST(request: Request, ctx: Ctx) {
  const { sourceId } = await ctx.params;
  let body: { snapshotId?: string } = {};
  try {
    const j = await request.json();
    if (j && typeof j === "object") body = j as { snapshotId?: string };
  } catch {
    /* empty body ok */
  }

  const db = getDb();
  const [src] = await db
    .select()
    .from(vaccineSources)
    .where(eq(vaccineSources.id, sourceId));
  if (!src) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const [vax] = await db
    .select()
    .from(vaccines)
    .where(eq(vaccines.id, src.vaccineId));
  if (!vax) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }

  let snap;
  if (body.snapshotId?.trim()) {
    const [s] = await db
      .select()
      .from(sourceSnapshots)
      .where(
        and(
          eq(sourceSnapshots.id, body.snapshotId.trim()),
          eq(sourceSnapshots.vaccineSourceId, sourceId)
        )
      );
    snap = s;
  } else {
    const [s] = await db
      .select()
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.vaccineSourceId, sourceId))
      .orderBy(desc(sourceSnapshots.fetchedAt))
      .limit(1);
    snap = s;
  }

  if (!snap) {
    return NextResponse.json(
      { error: "No snapshot for this source; fetch the URL first." },
      { status: 400 }
    );
  }
  if (snap.status !== "ok" || !snap.extractedText?.trim()) {
    return NextResponse.json(
      { error: "Latest snapshot has no extracted text; fix fetch or pick another snapshot." },
      { status: 400 }
    );
  }

  const extracted = await extractRulesWithAnthropic({
    vaccineName: vax.name,
    sourceType: src.sourceType,
    sourceUrl: src.url,
    snapshotText: snap.extractedText,
  });

  if (!extracted.ok) {
    return NextResponse.json({ error: extracted.error }, { status: 502 });
  }

  const now = Date.now();
  const id = crypto.randomUUID();
  await db.insert(coverageRuleSets).values({
    id,
    vaccineId: src.vaccineId,
    sourceSnapshotId: snap.id,
    status: "draft",
    rulesJson: JSON.stringify(extracted.data),
    extractor: EXTRACTOR_ID,
    model: extracted.model,
    promptVersion: RULES_PROMPT_VERSION,
    validationErrors: null,
    createdAt: now,
    updatedAt: now,
    publishedAt: null,
  });

  return NextResponse.json({
    id,
    vaccineId: src.vaccineId,
    status: "draft" as const,
    ruleCount: extracted.data.rules.length,
    model: extracted.model,
    extractor: EXTRACTOR_ID,
  });
}
