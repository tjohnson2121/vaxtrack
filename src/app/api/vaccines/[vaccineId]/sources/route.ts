import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vaccines, vaccineSources } from "@/db/schema";
import { isValidSourceType } from "@/lib/source-types";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ vaccineId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
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
  return NextResponse.json(sources);
}

export async function POST(request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
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
      : "";
  const sourceType =
    typeof body === "object" &&
    body !== null &&
    "sourceType" in body &&
    typeof (body as { sourceType: unknown }).sourceType === "string"
      ? (body as { sourceType: string }).sourceType.trim()
      : "";

  if (!urlRaw || !sourceType) {
    return NextResponse.json(
      { error: "url and sourceType are required" },
      { status: 400 }
    );
  }
  if (!isValidSourceType(sourceType)) {
    return NextResponse.json({ error: "Invalid sourceType" }, { status: 400 });
  }

  let parsed: URL;
  try {
    parsed = new URL(urlRaw);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  if (!["http:", "https:"].includes(parsed.protocol)) {
    return NextResponse.json(
      { error: "Only http(s) URLs are allowed" },
      { status: 400 }
    );
  }

  const db = getDb();
  const [v] = await db.select().from(vaccines).where(eq(vaccines.id, vaccineId));
  if (!v) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(vaccineSources).values({
    id,
    vaccineId,
    url: parsed.href,
    sourceType,
    createdAt: now,
  });

  const [row] = await db
    .select()
    .from(vaccineSources)
    .where(eq(vaccineSources.id, id));
  return NextResponse.json(row);
}
