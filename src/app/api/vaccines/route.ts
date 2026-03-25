import { NextResponse } from "next/server";
import { getDb } from "@/db";
import { vaccines } from "@/db/schema";
import { getVaccinesWithSourcesAndLatestSnapshot } from "@/lib/server/vaccine-queries";

export const runtime = "nodejs";

export async function GET() {
  const tree = await getVaccinesWithSourcesAndLatestSnapshot();
  return NextResponse.json(tree);
}

export async function POST(request: Request) {
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
  const id = crypto.randomUUID();
  const now = Date.now();
  await db.insert(vaccines).values({ id, name, createdAt: now });

  return NextResponse.json({
    id,
    name,
    createdAt: now,
    sources: [] as const,
  });
}
