/**
 * One-shot scrape runner: walks the registry, fetches each source, compares
 * to the prior snapshot, writes the new one, and opens a GitHub issue for any
 * detected change.
 *
 * Designed to be run from a small entry script (scripts/scrape.ts) — does not
 * depend on Next.js runtime. Safe to run from a laptop, GitHub Action, or
 * (later) a serverless cron with persistent storage.
 */
import { fetchSource } from "./fetch";
import { TRACKED_SOURCES, type TrackedSource } from "./registry";
import {
  countDiffLines,
  hashContent,
  readSnapshot,
  unifiedDiff,
  writeSnapshot,
  type Snapshot,
} from "./snapshot";
import { isGitHubConfigured, openOrUpdateChangeIssue } from "./github";

export type SourceOutcome =
  | { kind: "new"; source: TrackedSource; bytes: number }
  | { kind: "unchanged"; source: TrackedSource }
  | {
      kind: "changed";
      source: TrackedSource;
      added: number;
      removed: number;
      issue?: { action: "opened" | "commented" | "skipped"; issueNumber?: number; url?: string };
    }
  | { kind: "error"; source: TrackedSource; error: string };

export interface RunSummary {
  total: number;
  newCount: number;
  unchangedCount: number;
  changedCount: number;
  errorCount: number;
  outcomes: SourceOutcome[];
  startedAt: string;
  endedAt: string;
}

export interface RunOptions {
  /** Skip GitHub issue creation even if env vars are set. */
  dryRun?: boolean;
  /** Limit scrape to a subset of source keys (useful for debugging). */
  only?: string[];
  /** Concurrency for parallel fetches. */
  concurrency?: number;
  /** Per-source progress callback. */
  onProgress?: (outcome: SourceOutcome, idx: number, total: number) => void;
}

const DEFAULT_CONCURRENCY = 5;

export async function runScrape(opts: RunOptions = {}): Promise<RunSummary> {
  const startedAt = new Date().toISOString();
  const sources = opts.only
    ? TRACKED_SOURCES.filter((s) => opts.only!.includes(s.key))
    : TRACKED_SOURCES;
  const concurrency = opts.concurrency ?? DEFAULT_CONCURRENCY;
  const outcomes: SourceOutcome[] = [];

  // Lightweight worker-pool pattern — keeps total wall time reasonable.
  let idx = 0;
  async function worker() {
    while (idx < sources.length) {
      const myIdx = idx++;
      const src = sources[myIdx];
      const outcome = await processOne(src, opts);
      outcomes.push(outcome);
      opts.onProgress?.(outcome, myIdx + 1, sources.length);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(concurrency, sources.length) }, () => worker())
  );

  const endedAt = new Date().toISOString();
  const summary: RunSummary = {
    total: sources.length,
    newCount: outcomes.filter((o) => o.kind === "new").length,
    unchangedCount: outcomes.filter((o) => o.kind === "unchanged").length,
    changedCount: outcomes.filter((o) => o.kind === "changed").length,
    errorCount: outcomes.filter((o) => o.kind === "error").length,
    outcomes,
    startedAt,
    endedAt,
  };
  return summary;
}

async function processOne(src: TrackedSource, opts: RunOptions): Promise<SourceOutcome> {
  const result = await fetchSource(src.url, src.contentSelector);
  if (!result.ok) {
    return { kind: "error", source: src, error: result.error };
  }

  const newSnap: Snapshot = {
    sourceKey: src.key,
    url: src.url,
    finalUrl: result.finalUrl,
    fetchedAt: new Date().toISOString(),
    contentHash: hashContent(result.text),
    contentType: result.contentType,
    httpStatus: result.httpStatus,
    text: result.text,
  };

  const prev = await readSnapshot(src.key);
  if (!prev) {
    await writeSnapshot(newSnap);
    return { kind: "new", source: src, bytes: result.text.length };
  }

  if (prev.contentHash === newSnap.contentHash) {
    // Even when unchanged, refresh fetchedAt so we can see liveness later
    // without bloating the diff (write only if the date is much older).
    const ageMs = Date.now() - Date.parse(prev.fetchedAt);
    if (ageMs > 7 * 24 * 3600 * 1000) {
      await writeSnapshot({ ...prev, fetchedAt: newSnap.fetchedAt, httpStatus: newSnap.httpStatus });
    }
    return { kind: "unchanged", source: src };
  }

  const patch = unifiedDiff(prev.text, newSnap.text, src.key);
  const stats = countDiffLines(patch);
  await writeSnapshot(newSnap);

  let issue: { action: "opened" | "commented" | "skipped"; issueNumber?: number; url?: string } | undefined;
  if (!opts.dryRun && isGitHubConfigured()) {
    try {
      issue = await openOrUpdateChangeIssue({
        source: src,
        url: result.finalUrl,
        patch,
        stats,
      });
    } catch (err) {
      // Don't fail the run for a GitHub-side hiccup; record and move on.
      console.error(`[scrape] GitHub issue failed for ${src.key}:`, err);
    }
  }

  return {
    kind: "changed",
    source: src,
    added: stats.added,
    removed: stats.removed,
    issue,
  };
}
