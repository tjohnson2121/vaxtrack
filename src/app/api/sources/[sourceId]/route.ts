import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vaccineSources } from "@/db/schema";
import { isValidSourceType } from "@/lib/source-types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ sourceId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { sourceId } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const urlRaw =
    typeof body === "object" &&
    body !== null &&
    "url" in body &&
    typeof (body as { url: unknown }).url === "string"
      ? (body as { url: string }).url.trim()
      : undefined;
  const sourceType =
    typeof body === "object" &&
    body !== null &&
    "sourceType" in body &&
    typeof (body as { sourceType: unknown }).sourceType === "string"
      ? (body as { sourceType: string }).sourceType.trim()
      : undefined;

  if (!urlRaw && !sourceType) {
    return NextResponse.json(
      { error: "Provide url and/or sourceType" },
      { status: 400 }
    );
  }
  if (sourceType !== undefined && !isValidSourceType(sourceType)) {
    return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
  }

  let href: string | undefined;
  if (urlRaw !== undefined) {
    try {
      const parsed = new URL(urlRaw);
      if (!["http:", "https:"].includes(parsed.protocol)) {
        return NextResponse.json(
          { error: "Only http(s) URLs are allowed" },
          { status: 400 }
        );
      }
      href = parsed.href;
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(vaccineSources)
    .where(eq(vaccineSources.id, sourceId));
  if (!existing) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }

  await db
    .update(vaccineSources)
    .set({
      ...(href !== undefined ? { url: href } : {}),
      ...(sourceType !== undefined ? { sourceType } : {}),
    })
    .where(eq(vaccineSources.id, sourceId));

  const [row] = await db
    .select()
    .from(vaccineSources)
    .where(eq(vaccineSources.id, sourceId));
  return NextResponse.json(row);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { sourceId } = await ctx.params;
  const db = getDb();
  const res = await db
    .delete(vaccineSources)
    .where(eq(vaccineSources.id, sourceId))
    .returning();
  if (res.length === 0) {
    return NextResponse.json({ error: "Source not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
