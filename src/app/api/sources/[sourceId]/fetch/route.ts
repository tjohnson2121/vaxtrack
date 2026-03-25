import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vaccineSources, sourceSnapshots } from "@/db/schema";
import { fetchSourceUrl } from "@/lib/server/fetch-source";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function POST(_request: Request, ctx: Ctx) {
  const { sourceId } = await ctx.params;
  const db = getDb();
  const [src] = await db
    .select()
    .from(vaccineSources)
    .where(eq(vaccineSources.id, sourceId));
  if (!src) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  const result = await fetchSourceUrl(src.url);
  const id = crypto.randomUUID();
  const now = Date.now();

  await db.insert(sourceSnapshots).values({
    id,
    vaccineSourceId: sourceId,
    fetchedAt: now,
    status: result.ok ? "ok" : "error",
    httpStatus: result.httpStatus ?? null,
    contentType: result.contentType ?? null,
    extractedText: result.extractedText || null,
    contentHash: result.contentHash,
    finalUrl: result.finalUrl,
    errorMessage: result.errorMessage ?? null,
  });

  return NextResponse.json({
    snapshotId: id,
    fetchedAt: now,
    status: result.ok ? "ok" : "error",
    httpStatus: result.httpStatus,
    contentType: result.contentType,
    finalUrl: result.finalUrl,
    contentHash: result.contentHash,
    errorMessage: result.errorMessage,
    textPreview: result.extractedText.slice(0, 2000),
    textLength: result.extractedText.length,
  });
}
