#!/usr/bin/env tsx
/**
 * VaxTrack source scraper — entry point.
 *
 * Usage:
 *   pnpm scrape                    # full pass, create issues for changes
 *   pnpm scrape -- --dry           # no issues, just report
 *   pnpm scrape -- --only onPrograms,abRsv
 *
 * Env (optional; without them, issue creation is skipped):
 *   GITHUB_TOKEN   fine-grained PAT with Issues read+write
 *   GITHUB_REPO    owner/repo (e.g. tjohnson2121/vaxtrack)
 */
import { config as loadEnv } from "dotenv";
// Load .env then .env.local, matching Next.js convention (later wins).
loadEnv({ path: ".env" });
loadEnv({ path: ".env.local", override: true });

import { runScrape, type SourceOutcome } from "@/lib/scrape/runner";

function parseArgs() {
  const argv = process.argv.slice(2);
  let dryRun = false;
  let only: string[] | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry" || a === "--dry-run") dryRun = true;
    else if (a === "--only") {
      only = (argv[++i] ?? "").split(",").filter(Boolean);
    } else if (a.startsWith("--only=")) {
      only = a.slice("--only=".length).split(",").filter(Boolean);
    }
  }
  return { dryRun, only };
}

function summarizeOutcome(o: SourceOutcome): string {
  switch (o.kind) {
    case "new":
      return `  + NEW       ${o.source.key.padEnd(28)} ${o.bytes} bytes`;
    case "unchanged":
      return `    unchanged ${o.source.key.padEnd(28)}`;
    case "changed":
      const issueNote =
        o.issue?.action === "opened" ? ` → issue #${o.issue.issueNumber}` :
        o.issue?.action === "commented" ? ` → commented on #${o.issue.issueNumber}` :
        o.issue?.action === "skipped" ? " (no GitHub config)" : "";
      return `  ● CHANGED   ${o.source.key.padEnd(28)} +${o.added}/-${o.removed}${issueNote}`;
    case "error":
      return `  × ERROR     ${o.source.key.padEnd(28)} ${o.error}`;
  }
}

async function main() {
  const { dryRun, only } = parseArgs();
  console.log(`[scrape] starting${dryRun ? " (DRY RUN)" : ""}${only ? ` only: ${only.join(",")}` : ""}\n`);

  const summary = await runScrape({
    dryRun,
    only,
    onProgress: (outcome, idx, total) => {
      const prefix = `[${idx.toString().padStart(2)}/${total}]`;
      console.log(`${prefix} ${summarizeOutcome(outcome)}`);
    },
  });

  console.log("\n[scrape] summary:");
  console.log(`  total      ${summary.total}`);
  console.log(`  new        ${summary.newCount}`);
  console.log(`  unchanged  ${summary.unchangedCount}`);
  console.log(`  changed    ${summary.changedCount}`);
  console.log(`  errors     ${summary.errorCount}`);
  console.log(`  elapsed    ${(Date.parse(summary.endedAt) - Date.parse(summary.startedAt)) / 1000}s`);

  if (summary.errorCount > 0) {
    console.log("\n[scrape] errors:");
    for (const o of summary.outcomes) {
      if (o.kind === "error") console.log(`  ${o.source.key}: ${o.error}`);
    }
  }

  // Exit cleanly even on errors — we want fail-soft behaviour so one broken
  // gov page doesn't block detecting changes in the others.
  process.exit(0);
}

main().catch((err) => {
  console.error("[scrape] fatal:", err);
  process.exit(1);
});
