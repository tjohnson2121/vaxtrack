import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { vaccines } from "@/db/schema";
import { getVaccinesWithSourcesAndLatestSnapshot } from "@/lib/server/vaccine-queries";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ vaccineId: string }> };

export async function GET(_request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  const tree = await getVaccinesWithSourcesAndLatestSnapshot();
  const v = tree.find((x) => x.id === vaccineId);
  if (!v) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }
  return NextResponse.json(v);
}

export async function PATCH(request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const name =
    typeof body === "object" &&
    body !== null &&
    "name" in body &&
    typeof (body as { name: unknown }).name === "string"
      ? (body as { name: string }).name.trim()
      : "";
  if (!name) {
    return NextResponse.json({ error: "name is required" }, { status: 400 });
  }

  const db = getDb();
  const res = await db
    .update(vaccines)
    .set({ name })
    .where(eq(vaccines.id, vaccineId))
    .returning();
  if (res.length === 0) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }
  return NextResponse.json(res[0]);
}

export async function DELETE(_request: Request, ctx: Ctx) {
  const { vaccineId } = await ctx.params;
  const db = getDb();
  const res = await db.delete(vaccines).where(eq(vaccines.id, vaccineId)).returning();
  if (res.length === 0) {
    return NextResponse.json({ error: "Vaccine not found" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
