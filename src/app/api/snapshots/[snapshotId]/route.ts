import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { sourceSnapshots } from "@/db/schema";

export const runtime = "nodejs";

type Ctx = { params: Promise<{ snapshotId: string }> };

/** Full snapshot payload for review UI (text can be large). */
export async function GET(_request: Request, ctx: Ctx) {
  const { snapshotId } = await ctx.params;
  const db = getDb();
  const [row] = await db
    .select()
    .from(sourceSnapshots)
    .where(eq(sourceSnapshots.id, snapshotId));
  if (!row) {
    return NextResponse.json({ error: "Snapshot not found" }, { status: 404 });
  }
  return NextResponse.json(row);
}
