/**
 * Snapshot persistence — stores per-source page text in snapshots/{key}.json,
 * committed to git so "what changed" is just a regular git diff.
 *
 * File format keeps the previous text inline so we can compute a diff without
 * walking git history (which is fine, but harder to do from a Node script
 * portably).
 */
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { createTwoFilesPatch } from "diff";

export interface Snapshot {
  sourceKey: string;
  url: string;
  finalUrl?: string;
  fetchedAt: string; // ISO
  contentHash: string; // sha256:...
  contentType: "html" | "pdf" | "text";
  httpStatus?: number;
  /** Extracted text. May be elided if very large, but small enough that we keep it. */
  text: string;
}

export interface ErrorSnapshot {
  sourceKey: string;
  url: string;
  fetchedAt: string;
  error: string;
}

const SNAPSHOT_DIR = path.resolve(process.cwd(), "snapshots");

export function snapshotPath(sourceKey: string): string {
  return path.join(SNAPSHOT_DIR, `${sourceKey}.json`);
}

export function hashContent(text: string): string {
  return "sha256:" + createHash("sha256").update(text).digest("hex");
}

export async function ensureSnapshotDir(): Promise<void> {
  await fs.mkdir(SNAPSHOT_DIR, { recursive: true });
}

export async function readSnapshot(sourceKey: string): Promise<Snapshot | null> {
  try {
    const raw = await fs.readFile(snapshotPath(sourceKey), "utf-8");
    return JSON.parse(raw) as Snapshot;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") return null;
    throw err;
  }
}

export async function writeSnapshot(snap: Snapshot): Promise<void> {
  await ensureSnapshotDir();
  // Pretty-print so git diffs are reviewable line-by-line.
  await fs.writeFile(snapshotPath(snap.sourceKey), JSON.stringify(snap, null, 2) + "\n", "utf-8");
}

/** Generate a unified diff (suitable for posting inside a GitHub issue code block). */
export function unifiedDiff(prev: string, next: string, label: string): string {
  return createTwoFilesPatch(
    `${label} (previous)`,
    `${label} (current)`,
    prev,
    next,
    undefined,
    undefined,
    { context: 3 }
  );
}

export interface DiffStats {
  added: number;
  removed: number;
}

/** Cheap line-add/remove count from a unified diff. */
export function countDiffLines(patch: string): DiffStats {
  let added = 0;
  let removed = 0;
  for (const line of patch.split("\n")) {
    if (line.startsWith("+++") || line.startsWith("---")) continue;
    if (line.startsWith("+")) added++;
    else if (line.startsWith("-")) removed++;
  }
  return { added, removed };
}
