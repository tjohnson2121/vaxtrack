/**
 * Open a GitHub issue for a detected source change.
 *
 * Idempotent-ish: if an existing OPEN issue carries the same source-key label
 * (e.g. "source:onArexvy"), we comment on it instead of opening a duplicate.
 *
 * Env required:
 *   GITHUB_TOKEN   — fine-grained PAT with Issues: read+write on the repo
 *   GITHUB_REPO    — "owner/repo", e.g. "tjohnson2121/vaxtrack"
 */
import { Octokit } from "@octokit/rest";
import type { TrackedSource } from "./registry";
import type { DiffStats } from "./snapshot";

interface IssuePayload {
  source: TrackedSource;
  url: string;
  patch: string;
  stats: DiffStats;
}

const SOURCE_LABEL_PREFIX = "source:";
const SCRAPE_LABEL = "scrape:change";

function parseRepo(): { owner: string; repo: string } {
  const slug = process.env.GITHUB_REPO;
  if (!slug) throw new Error("GITHUB_REPO env var not set (e.g. 'owner/repo')");
  const [owner, repo] = slug.split("/");
  if (!owner || !repo) throw new Error(`GITHUB_REPO must be 'owner/repo', got '${slug}'`);
  return { owner, repo };
}

function clientOrNull(): Octokit | null {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return null;
  return new Octokit({ auth: token });
}

export function isGitHubConfigured(): boolean {
  return Boolean(process.env.GITHUB_TOKEN && process.env.GITHUB_REPO);
}

function renderBody(p: IssuePayload): string {
  const { source, url, patch, stats } = p;
  return [
    `**Source:** [${source.label}](${url})`,
    `**Key:** \`${source.key}\``,
    `**Category:** \`${source.category}\``,
    `**Change:** +${stats.added} / −${stats.removed} lines`,
    "",
    "<details><summary>Unified diff</summary>",
    "",
    "```diff",
    patch.trim(),
    "```",
    "",
    "</details>",
    "",
    "_Auto-opened by VaxTrack source scraper. Review and update the relevant rules in `evaluate.ts` / `evaluate-hpv.ts` / `evaluate-shingles.ts`, then close this issue._",
  ].join("\n");
}

export async function openOrUpdateChangeIssue(p: IssuePayload): Promise<{
  action: "opened" | "commented" | "skipped";
  issueNumber?: number;
  url?: string;
}> {
  const client = clientOrNull();
  if (!client) {
    console.warn("[scrape] GITHUB_TOKEN not set — skipping issue creation");
    return { action: "skipped" };
  }
  const { owner, repo } = parseRepo();
  const sourceLabel = `${SOURCE_LABEL_PREFIX}${p.source.key}`;

  // Look for an existing OPEN issue with this source label.
  const existing = await client.issues.listForRepo({
    owner,
    repo,
    state: "open",
    labels: `${SCRAPE_LABEL},${sourceLabel}`,
    per_page: 1,
  });

  const title = `Source change — ${p.source.label}`;
  const body = renderBody(p);

  if (existing.data.length > 0) {
    const issue = existing.data[0];
    await client.issues.createComment({
      owner,
      repo,
      issue_number: issue.number,
      body: `Another change detected on \`${p.source.key}\` (+${p.stats.added} / −${p.stats.removed} lines).\n\n${body}`,
    });
    return { action: "commented", issueNumber: issue.number, url: issue.html_url };
  }

  // Ensure labels exist (idempotent: errors on duplicate are harmless).
  await ensureLabel(client, owner, repo, SCRAPE_LABEL, "0e8a16", "Detected source page change");
  await ensureLabel(client, owner, repo, sourceLabel, "ededed", `Source key: ${p.source.key}`);

  const created = await client.issues.create({
    owner,
    repo,
    title,
    body,
    labels: [SCRAPE_LABEL, sourceLabel],
  });
  return { action: "opened", issueNumber: created.data.number, url: created.data.html_url };
}

async function ensureLabel(
  client: Octokit,
  owner: string,
  repo: string,
  name: string,
  color: string,
  description: string
): Promise<void> {
  try {
    await client.issues.createLabel({ owner, repo, name, color, description });
  } catch (err) {
    const status = (err as { status?: number }).status;
    if (status !== 422) throw err; // 422 = already exists
  }
}
