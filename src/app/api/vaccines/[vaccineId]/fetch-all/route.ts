import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vaccines, vaccineSources, sourceSnapshots } from "@/db/schema";
import { fetchSourceUrl } from "@/lib/server/fetch-source";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ vaccineId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  const db = getDb();
  const [v] = await db.select().from(vaccines).where(eq(vaccines.id, vaccineId));
  if (!v) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }

  const sources = await db
    .select()
    .from(vaccineSources)
    .where(eq(vaccineSources.vaccineId, vaccineId));

  const results: {
    sourceId: string;
    snapshotId: string;
    status: string;
    errorMessage?: string;
  }[] = [];

  for (const src of sources) {
    const result = await fetchSourceUrl(src.url);
    const id = crypto.randomUUID();
    const now = Date.now();
    await db.insert(sourceSnapshots).values({
      id,
      vaccineSourceId: src.id,
      fetchedAt: now,
      status: result.ok ? "ok" : "error",
      httpStatus: result.httpStatus ?? null,
      contentType: result.contentType ?? null,
      extractedText: result.extractedText || null,
      contentHash: result.contentHash,
      finalUrl: result.finalUrl,
      errorMessage: result.errorMessage ?? null,
    });
    results.push({
      sourceId: src.id,
      snapshotId: id,
      status: result.ok ? "ok" : "error",
      errorMessage: result.errorMessage,
    });
  }

  return NextResponse.json({ count: results.length, results });
}
