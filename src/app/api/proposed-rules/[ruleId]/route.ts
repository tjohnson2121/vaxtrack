import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { proposedRules } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ ruleId: string }> };

export async function PATCH(request: Request, ctx: Ctx) {
  const { ruleId } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const db = getDb();
  const [existing] = await db
    .select()
    .from(proposedRules)
    .where(eq(proposedRules.id, ruleId));
  if (!existing) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }

  const updates: Partial<{
    title: string | null;
    body: string;
    status: string;
    updatedAt: number;
  }> = { updatedAt: Date.now() };

  if (
    typeof body === "object" &&
    body !== null &&
    "title" in body &&
    typeof (body as { title: unknown }).title === "string"
  ) {
    updates.title = (body as { title: string }).title.trim() || null;
  }
  if (
    typeof body === "object" &&
    body !== null &&
    "body" in body &&
    typeof (body as { body: unknown }).body === "string"
  ) {
    const b = (body as { body: string }).body;
    if (!b.trim()) {
      return NextResponse.json({ error: "body cannot be empty" }, { status: 400 });
    }
    updates.body = b;
  }
  if (
    typeof body === "object" &&
    body !== null &&
    "status" in body &&
    typeof (body as { status: unknown }).status === "string"
  ) {
    const s = (body as { status: string }).status;
    if (s !== "draft" && s !== "published") {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = s;
  }

  await db.update(proposedRules).set(updates).where(eq(proposedRules.id, ruleId));

  const [row] = await db
    .select()
    .from(proposedRules)
    .where(eq(proposedRules.id, ruleId));
  return NextResponse.json(row);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { ruleId } = await ctx.params;
  const db = getDb();
  const res = await db
    .delete(proposedRules)
    .where(eq(proposedRules.id, ruleId))
    .returning();
  if (res.length === 0) {
    return NextResponse.json({ error: "Rule not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
