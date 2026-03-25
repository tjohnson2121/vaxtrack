"use client";

import { useCallback, useEffect, useState } from "react";
import { SOURCE_TYPES } from "@/lib/source-types";
import {
  apiFetch,
  getStoredAdminToken,
  setStoredAdminToken,
  ADMIN_TOKEN_STORAGE_KEY,
} from "@/lib/api-client";
import type {
  VaccineWithSources,
  ProposedRuleRow,
  SnapshotSummary,
  CoverageRuleSetSummary,
} from "@/lib/vaccine-tree-types";

export function VaccineSourcesManager() {
  const [tree, setTree] = useState<VaccineWithSources[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [adminTokenInput, setAdminTokenInput] = useState("");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [newVaccineName, setNewVaccineName] = useState("");
  const [draftUrls, setDraftUrls] = useState<
    Record<string, { url: string; sourceType: string }>
  >({});
  const [busy, setBusy] = useState<Record<string, boolean>>({});
  const [snapshotModal, setSnapshotModal] = useState<string | null>(null);
  const [snapshotText, setSnapshotText] = useState<string | null>(null);
  const [proposedByVaccine, setProposedByVaccine] = useState<
    Record<string, ProposedRuleRow[]>
  >({});
  const [proposedDraft, setProposedDraft] = useState<
    Record<string, { title: string; body: string }>
  >({});
  const [ruleSetsByVaccine, setRuleSetsByVaccine] = useState<
    Record<string, CoverageRuleSetSummary[]>
  >({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await apiFetch("/api/vaccines");
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(
        (j as { error?: string }).error ??
          `Failed to load (${res.status}). Set admin token if the server requires it.`
      );
      setTree([]);
      setLoading(false);
      return;
    }
    const data = (await res.json()) as VaccineWithSources[];
    setTree(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    setAdminTokenInput(getStoredAdminToken() ?? "");
    void load();
  }, [load]);

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === ADMIN_TOKEN_STORAGE_KEY) void load();
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, [load]);

  const saveToken = () => {
    setStoredAdminToken(adminTokenInput.trim() || null);
    void load();
  };

  const toggleExpand = (id: string) => {
    setExpanded((e) => ({ ...e, [id]: !e[id] }));
  };

  const loadProposed = async (vaccineId: string) => {
    const res = await apiFetch(`/api/vaccines/${vaccineId}/proposed-rules`);
    if (!res.ok) return;
    const rules = (await res.json()) as ProposedRuleRow[];
    setProposedByVaccine((p) => ({ ...p, [vaccineId]: rules }));
  };

  const loadRuleSets = async (vaccineId: string) => {
    const res = await apiFetch(`/api/vaccines/${vaccineId}/rule-sets`);
    if (!res.ok) return;
    const rows = (await res.json()) as CoverageRuleSetSummary[];
    setRuleSetsByVaccine((p) => ({ ...p, [vaccineId]: rows }));
  };

  useEffect(() => {
    for (const v of tree) {
      if (expanded[v.id]) {
        void loadProposed(v.id);
        void loadRuleSets(v.id);
      }
    }
  }, [tree, expanded]);

  const addVaccine = async () => {
    const name = newVaccineName.trim();
    if (!name) return;
    setBusy((b) => ({ ...b, addVaccine: true }));
    const res = await apiFetch("/api/vaccines", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setBusy((b) => ({ ...b, addVaccine: false }));
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Create failed");
      return;
    }
    setNewVaccineName("");
    await load();
  };

  const getDraft = (vaccineId: string) =>
    draftUrls[vaccineId] ?? { url: "", sourceType: "ON" };

  const setDraft = (
    vaccineId: string,
    patch: Partial<{ url: string; sourceType: string }>
  ) => {
    setDraftUrls((d) => ({
      ...d,
      [vaccineId]: { ...getDraft(vaccineId), ...patch },
    }));
  };

  const addSource = async (vaccineId: string) => {
    const d = getDraft(vaccineId);
    if (!d.url.trim()) return;
    setBusy((b) => ({ ...b, [`src-${vaccineId}`]: true }));
    const res = await apiFetch(`/api/vaccines/${vaccineId}/sources`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: d.url.trim(), sourceType: d.sourceType }),
    });
    setBusy((b) => ({ ...b, [`src-${vaccineId}`]: false }));
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Add source failed");
      return;
    }
    setDraft(vaccineId, { url: "" });
    await load();
  };

  const fetchOne = async (sourceId: string) => {
    setBusy((b) => ({ ...b, [`fetch-${sourceId}`]: true }));
    const res = await apiFetch(`/api/sources/${sourceId}/fetch`, {
      method: "POST",
    });
    setBusy((b) => ({ ...b, [`fetch-${sourceId}`]: false }));
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Fetch failed");
      return;
    }
    await load();
  };

  const fetchAll = async (vaccineId: string) => {
    setBusy((b) => ({ ...b, [`fetchAll-${vaccineId}`]: true }));
    const res = await apiFetch(`/api/vaccines/${vaccineId}/fetch-all`, {
      method: "POST",
    });
    setBusy((b) => ({ ...b, [`fetchAll-${vaccineId}`]: false }));
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Fetch all failed");
      return;
    }
    await load();
  };

  const removeSource = async (sourceId: string) => {
    if (!confirm("Remove this URL from the vaccine?")) return;
    const res = await apiFetch(`/api/sources/${sourceId}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      setError("Delete failed");
      return;
    }
    await load();
  };

  const openSnapshot = async (snapshotId: string) => {
    setSnapshotModal(snapshotId);
    setSnapshotText(null);
    const res = await apiFetch(`/api/snapshots/${snapshotId}`);
    if (!res.ok) {
      setSnapshotText("Could not load snapshot.");
      return;
    }
    const row = (await res.json()) as {
      extractedText: string | null;
      errorMessage: string | null;
      finalUrl: string | null;
    };
    const parts = [
      row.finalUrl ? `URL: ${row.finalUrl}\n\n` : "",
      row.errorMessage ? `Error: ${row.errorMessage}\n\n` : "",
      row.extractedText ?? "(no extracted text)",
    ];
    setSnapshotText(parts.join(""));
  };

  const saveProposed = async (vaccineId: string) => {
    const d = proposedDraft[vaccineId] ?? { title: "", body: "" };
    if (!d.body.trim()) {
      setError("Proposed rules JSON/text cannot be empty.");
      return;
    }
    const res = await apiFetch(`/api/vaccines/${vaccineId}/proposed-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: d.title.trim() || undefined,
        body: d.body,
        status: "draft",
      }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Save proposed rules failed");
      return;
    }
    setProposedDraft((p) => ({ ...p, [vaccineId]: { title: "", body: "" } }));
    await loadProposed(vaccineId);
  };

  const publishProposedRule = async (ruleId: string, vaccineId: string) => {
    const res = await apiFetch(`/api/proposed-rules/${ruleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "published" }),
    });
    if (!res.ok) return;
    await loadProposed(vaccineId);
  };

  const extractRules = async (sourceId: string, snapshotId: string) => {
    setSuccess(null);
    setBusy((b) => ({ ...b, [`extract-${sourceId}`]: true }));
    const res = await apiFetch(`/api/sources/${sourceId}/extract-rules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ snapshotId }),
    });
    setBusy((b) => ({ ...b, [`extract-${sourceId}`]: false }));
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError(
        (j as { error?: string }).error ?? "Extract rules failed (check API key and snapshot text)."
      );
      return;
    }
    setError(null);
    const j = (await res.json()) as {
      vaccineId: string;
      ruleCount?: number;
    };
    await loadRuleSets(j.vaccineId);
    const n = j.ruleCount ?? 0;
    setSuccess(
      `Claude saved a draft rule set (${n} rule${n === 1 ? "" : "s"}). Scroll to “Coverage rule sets” below and click Publish — only then will this vaccine appear on the Coverage check page.`
    );
  };

  const publishCoverageRuleSet = async (ruleSetId: string, vaccineId: string) => {
    setSuccess(null);
    setBusy((b) => ({ ...b, [`publish-rs-${ruleSetId}`]: true }));
    const res = await apiFetch(`/api/rule-sets/${ruleSetId}/publish`, {
      method: "POST",
    });
    setBusy((b) => ({ ...b, [`publish-rs-${ruleSetId}`]: false }));
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setError((j as { error?: string }).error ?? "Publish rule set failed");
      return;
    }
    setError(null);
    await loadRuleSets(vaccineId);
    const name = tree.find((v) => v.id === vaccineId)?.name ?? "This vaccine";
    setSuccess(
      `${name} is now live for coverage check. Open the Coverage check page (or switch back to that tab) to select it in the vaccine dropdown.`
    );
  };

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-zinc-200 bg-amber-50/80 p-4 text-sm dark:border-zinc-700 dark:bg-amber-950/30">
        <p className="font-medium text-amber-950 dark:text-amber-100">
          Admin API access
        </p>
        <p className="mt-1 text-amber-900/90 dark:text-amber-200/90">
          If <code className="rounded bg-black/10 px-1">ADMIN_TOKEN</code> is set
          on the server, enter the same value here. It is kept in{" "}
          <strong>session storage</strong> for this browser tab only.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <input
            type="password"
            className="min-w-[200px] flex-1 rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm dark:border-zinc-600 dark:bg-zinc-900"
            placeholder="Bearer token (optional)"
            value={adminTokenInput}
            onChange={(e) => setAdminTokenInput(e.target.value)}
          />
          <button
            type="button"
            onClick={saveToken}
            className="rounded-lg bg-amber-800 px-4 py-2 text-sm font-medium text-white hover:bg-amber-900 dark:bg-amber-700 dark:hover:bg-amber-600"
          >
            Save token
          </button>
        </div>
      </section>

      {success && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-50">
          {success}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setSuccess(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/50 dark:text-red-100">
          {error}
          <button
            type="button"
            className="ml-3 underline"
            onClick={() => setError(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <section className="flex flex-wrap items-end gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-950">
        <label className="flex min-w-[200px] flex-1 flex-col gap-1 text-sm font-medium">
          New vaccine name
          <input
            className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
            value={newVaccineName}
            onChange={(e) => setNewVaccineName(e.target.value)}
            placeholder="e.g. RSV"
          />
        </label>
        <button
          type="button"
          disabled={busy.addVaccine}
          onClick={() => void addVaccine()}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-700 text-xl font-bold text-white hover:bg-teal-800 disabled:opacity-50 dark:bg-teal-600"
          title="Add vaccine"
        >
          +
        </button>
      </section>

      {loading ? (
        <p className="text-sm text-zinc-500">Loading…</p>
      ) : tree.length === 0 ? (
        <p className="text-sm text-zinc-500">
          No vaccines yet. Add one with the + button.
        </p>
      ) : (
        <ul className="space-y-4">
          {tree.map((v) => (
            <li
              key={v.id}
              className="rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-950"
            >
              <button
                type="button"
                onClick={() => toggleExpand(v.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="font-semibold">{v.name}</span>
                <span className="text-sm text-zinc-500">
                  {expanded[v.id] ? "Hide" : "Show"} · {v.sources.length} URL
                  {v.sources.length === 1 ? "" : "s"}
                </span>
              </button>
              {expanded[v.id] && (
                <div className="space-y-4 border-t border-zinc-100 px-4 py-4 dark:border-zinc-800">
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busy[`fetchAll-${v.id}`]}
                      onClick={() => void fetchAll(v.id)}
                      className="rounded-lg bg-zinc-900 px-3 py-2 text-xs font-medium text-white hover:bg-zinc-800 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
                    >
                      Fetch all sources
                    </button>
                  </div>

                  <div className="rounded-lg border border-dashed border-zinc-300 p-3 dark:border-zinc-600">
                    <p className="text-xs font-medium text-zinc-500">
                      Add data source URL
                    </p>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-end">
                      <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm">
                        URL
                        <input
                          className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                          value={getDraft(v.id).url}
                          onChange={(e) =>
                            setDraft(v.id, { url: e.target.value })
                          }
                          placeholder="https://…"
                        />
                      </label>
                      <label className="flex flex-col gap-1 text-sm sm:w-56">
                        Source type
                        <select
                          className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                          value={getDraft(v.id).sourceType}
                          onChange={(e) =>
                            setDraft(v.id, { sourceType: e.target.value })
                          }
                        >
                          {SOURCE_TYPES.map((t) => (
                            <option key={t.value} value={t.value}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        disabled={busy[`src-${v.id}`]}
                        onClick={() => void addSource(v.id)}
                        className="h-10 rounded-lg bg-teal-700 px-4 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
                      >
                        Add URL
                      </button>
                    </div>
                  </div>

                  {v.sources.length > 0 ? (
                    <ul className="space-y-3">
                      {v.sources.map((s) => {
                        const snap = s.latestSnapshot as SnapshotSummary | null;
                        return (
                          <li
                            key={s.id}
                            className="rounded-lg border border-zinc-200 p-3 text-sm dark:border-zinc-700"
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <p className="font-mono text-xs text-teal-800 dark:text-teal-400">
                                  {s.sourceType}
                                </p>
                                <a
                                  href={s.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="break-all text-zinc-700 underline dark:text-zinc-300"
                                >
                                  {s.url}
                                </a>
                                {snap && (
                                  <p className="mt-2 text-xs text-zinc-500">
                                    Last fetch:{" "}
                                    {new Date(snap.fetchedAt).toLocaleString()}{" "}
                                    · {snap.status}
                                    {snap.errorMessage
                                      ? ` · ${snap.errorMessage}`
                                      : ""}
                                    <br />
                                    Hash:{" "}
                                    <code className="text-[10px]">
                                      {snap.contentHash.slice(0, 16)}…
                                    </code>
                                  </p>
                                )}
                              </div>
                              <div className="flex shrink-0 flex-wrap gap-2">
                                <button
                                  type="button"
                                  disabled={busy[`fetch-${s.id}`]}
                                  onClick={() => void fetchOne(s.id)}
                                  className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                                >
                                  Fetch
                                </button>
                                {snap && (
                                  <button
                                    type="button"
                                    onClick={() => void openSnapshot(snap.id)}
                                    className="rounded border border-zinc-300 px-2 py-1 text-xs font-medium hover:bg-zinc-50 dark:border-zinc-600 dark:hover:bg-zinc-900"
                                  >
                                    View text
                                  </button>
                                )}
                                {snap &&
                                  snap.status === "ok" &&
                                  snap.extractedText && (
                                    <button
                                      type="button"
                                      disabled={busy[`extract-${s.id}`]}
                                      onClick={() =>
                                        void extractRules(s.id, snap.id)
                                      }
                                      className="rounded border border-violet-400 bg-violet-50 px-2 py-1 text-xs font-medium text-violet-900 hover:bg-violet-100 disabled:opacity-50 dark:border-violet-700 dark:bg-violet-950/50 dark:text-violet-100 dark:hover:bg-violet-950"
                                    >
                                      Extract rules (Claude)
                                    </button>
                                  )}
                                <button
                                  type="button"
                                  onClick={() => void removeSource(s.id)}
                                  className="rounded border border-red-200 px-2 py-1 text-xs text-red-800 hover:bg-red-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950/50"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-zinc-500">No URLs yet.</p>
                  )}

                  <div className="rounded-lg border border-zinc-200 p-3 dark:border-zinc-700">
                    <p className="text-sm font-medium">
                      Proposed rules (draft JSON or notes)
                    </p>
                    <p className="mt-1 text-xs text-zinc-500">
                      For human review before any future publish into the
                      coverage engine. Status: draft → published (tracking
                      only in V0).
                    </p>
                    <label className="mt-3 flex flex-col gap-1 text-sm">
                      Title (optional)
                      <input
                        className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                        value={proposedDraft[v.id]?.title ?? ""}
                        onChange={(e) =>
                          setProposedDraft((p) => ({
                            ...p,
                            [v.id]: {
                              title: e.target.value,
                              body: p[v.id]?.body ?? "",
                            },
                          }))
                        }
                      />
                    </label>
                    <label className="mt-2 flex flex-col gap-1 text-sm">
                      Body
                      <textarea
                        rows={6}
                        className="rounded-lg border border-zinc-300 px-3 py-2 font-mono text-xs dark:border-zinc-700 dark:bg-zinc-900"
                        value={proposedDraft[v.id]?.body ?? ""}
                        onChange={(e) =>
                          setProposedDraft((p) => ({
                            ...p,
                            [v.id]: {
                              title: p[v.id]?.title ?? "",
                              body: e.target.value,
                            },
                          }))
                        }
                        placeholder='e.g. [ { "jurisdiction": "ON", "product": "Arexvy", ... } ]'
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => void saveProposed(v.id)}
                      className="mt-2 rounded-lg bg-zinc-800 px-3 py-2 text-xs font-medium text-white dark:bg-zinc-200 dark:text-zinc-900"
                    >
                      Save draft
                    </button>
                    {(proposedByVaccine[v.id] ?? []).length > 0 && (
                      <ul className="mt-4 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
                        {(proposedByVaccine[v.id] ?? []).map((r) => (
                          <li
                            key={r.id}
                            className="rounded border border-zinc-100 px-2 py-2 text-xs dark:border-zinc-800"
                          >
                            <span className="font-medium">
                              {r.title ?? "(no title)"}
                            </span>{" "}
                            · <code>{r.status}</code>
                            {r.status === "draft" && (
                              <button
                                type="button"
                                className="ml-2 underline"
                                onClick={() =>
                                  void publishProposedRule(r.id, v.id)
                                }
                              >
                                Mark published
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  <div className="rounded-lg border border-violet-200 bg-violet-50/50 p-3 dark:border-violet-900 dark:bg-violet-950/20">
                    <p className="text-sm font-medium text-violet-950 dark:text-violet-100">
                      Coverage rule sets (Claude → draft → publish)
                    </p>
                    <p className="mt-1 text-xs text-violet-900/80 dark:text-violet-200/80">
                      Extract rules only creates a draft. You must click Publish
                      here so this vaccine shows up in the vaccine dropdown on
                      the Coverage check page. Publishing replaces any previous
                      published set for this vaccine.
                    </p>
                    {(ruleSetsByVaccine[v.id] ?? []).length === 0 ? (
                      <p className="mt-2 text-xs text-zinc-500">
                        No rule sets yet. Fetch a source, then use &quot;Extract
                        rules (Claude)&quot; on a row with extracted text.
                      </p>
                    ) : (
                      <ul className="mt-3 space-y-2 border-t border-violet-200 pt-3 dark:border-violet-800">
                        {(ruleSetsByVaccine[v.id] ?? []).map((rs) => (
                          <li
                            key={rs.id}
                            className="flex flex-wrap items-center justify-between gap-2 rounded border border-violet-100 bg-white/80 px-2 py-2 text-xs dark:border-violet-900 dark:bg-zinc-950/80"
                          >
                            <div>
                              <code className="text-[10px] text-zinc-500">
                                {rs.id.slice(0, 8)}…
                              </code>
                              <span className="ml-2 font-medium">
                                {rs.status}
                              </span>
                              {rs.model && (
                                <span className="ml-2 text-zinc-500">
                                  {rs.model}
                                </span>
                              )}
                              <div className="text-[10px] text-zinc-400">
                                {new Date(rs.createdAt).toLocaleString()}
                              </div>
                            </div>
                            {rs.status === "draft" && (
                              <button
                                type="button"
                                disabled={busy[`publish-rs-${rs.id}`]}
                                onClick={() =>
                                  void publishCoverageRuleSet(rs.id, v.id)
                                }
                                className="rounded bg-violet-700 px-2 py-1 text-xs font-medium text-white hover:bg-violet-800 disabled:opacity-50"
                              >
                                Publish
                              </button>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {snapshotModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal
        >
          <div className="max-h-[85vh] w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-xl dark:bg-zinc-900">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3 dark:border-zinc-700">
              <span className="text-sm font-medium">Snapshot text</span>
              <button
                type="button"
                onClick={() => {
                  setSnapshotModal(null);
                  setSnapshotText(null);
                }}
                className="rounded px-2 py-1 text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Close
              </button>
            </div>
            <pre className="max-h-[70vh] overflow-auto p-4 text-xs whitespace-pre-wrap">
              {snapshotText ?? "Loading…"}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
