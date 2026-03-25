import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vaccines, proposedRules, sourceSnapshots } from "@/db/schema";
import { getProposedRulesForVaccine } from "@/lib/server/vaccine-queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ vaccineId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  const db = getDb();
  const [v] = await db.select().from(vaccines).where(eq(vaccines.id, vaccineId));
  if (!v) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }
  const rules = await getProposedRulesForVaccine(vaccineId);
  return NextResponse.json(rules);
}

export async function POST(request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const ruleBody =
    typeof body === "object" &&
    body !== null &&
    "body" in body &&
    typeof (body as { body: unknown }).body === "string"
      ? (body as { body: string }).body
      : "";
  if (!ruleBody.trim()) {
    return NextResponse.json({ error: "body is required" }, { status: 400 });
  }

  const title =
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof (body as { title: unknown }).title === "string"
      ? (body as { title: string }).title.trim() || null
      : null;

  const sourceSnapshotId =
    typeof body === "object" &&
    body !== null &&
    "sourceSnapshotId" in body &&
    typeof (body as { sourceSnapshotId: unknown }).sourceSnapshotId ===
      "string"
      ? (body as { sourceSnapshotId: string }).sourceSnapshotId.trim() || null
      : null;

  let status = "draft";
  if (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    typeof (body as { status: unknown }).status === "string"
  ) {
    const s = (body as { status: string }).status;
    if (s === "draft" || s === "published") status = s;
  }

  const db = getDb();
  const [v] = await db.select().from(vaccines).where(eq(vaccines.id, vaccineId));
  if (!v) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }

  if (sourceSnapshotId) {
    const [snap] = await db
      .select()
      .from(sourceSnapshots)
      .where(eq(sourceSnapshots.id, sourceSnapshotId));
    if (!snap) {
      return NextResponse.json(
        { error: "sourceSnapshotId not found" },
        { status: 400 }
      );
    }
  }

  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(proposedRules).values({
    id,
    vaccineId,
    sourceSnapshotId,
    title,
    body: ruleBody,
    status,
    createdAt: now,
    updatedAt: now,
  });

  const [row] = await db
    .select()
    .from(proposedRules)
    .where(eq(proposedRules.id, id));
  return NextResponse.json(row);
}
