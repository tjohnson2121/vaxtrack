"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ConditionId, Jurisdiction, NaciVsHcGap, VaccineProduct } from "@/lib/coverage/types";
import type { CoverageResult } from "@/lib/coverage/types";
import { SOURCES } from "@/lib/coverage/sources";

function NaciVsHcGapCard({ gap }: { gap: NaciVsHcGap }) {
  const alignmentConfig = {
    full: {
      label: "Aligned",
      dot: "bg-emerald-500",
      badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
    },
    partial: {
      label: "Partial",
      dot: "bg-amber-500",
      badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
    },
    gap: {
      label: "Gap",
      dot: "bg-rose-500",
      badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-300",
    },
  }[gap.alignment];

  return (
    <div className="rounded-md border border-black/15 bg-white/50 p-3 dark:bg-black/25">
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase opacity-80">HC vs NACI</p>
        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-semibold ${alignmentConfig.badge}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${alignmentConfig.dot}`} />
          {alignmentConfig.label}
        </span>
      </div>
      <div className="space-y-1.5 text-xs">
        <div className="flex items-start gap-2">
          <span className="w-10 shrink-0 rounded bg-zinc-200 px-1 py-0.5 text-center font-semibold text-zinc-700 dark:bg-zinc-700 dark:text-zinc-300">HC</span>
          <span className="opacity-90">{gap.hcIndication}</span>
        </div>
        <div className="flex items-start gap-2">
          <span className="w-10 shrink-0 rounded bg-blue-100 px-1 py-0.5 text-center font-semibold text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">NACI</span>
          <span className="opacity-90">{gap.naciGrade}</span>
        </div>
        {gap.gapDetail && (
          <div className="flex items-start gap-2 pt-0.5">
            <span className="w-10 shrink-0 rounded bg-amber-100 px-1 py-0.5 text-center font-semibold text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">Gap</span>
            <span className="opacity-80">{gap.gapDetail}</span>
          </div>
        )}
      </div>
    </div>
  );
}

const JURISDICTIONS: { id: Jurisdiction; label: string }[] = [
  { id: "AB", label: "Alberta" },
  { id: "BC", label: "British Columbia" },
  { id: "MB", label: "Manitoba" },
  { id: "NB", label: "New Brunswick" },
  { id: "NL", label: "Newfoundland & Labrador" },
  { id: "NS", label: "Nova Scotia" },
  { id: "NT", label: "Northwest Territories" },
  { id: "NU", label: "Nunavut" },
  { id: "ON", label: "Ontario" },
  { id: "PE", label: "PEI" },
  { id: "QC", label: "Quebec" },
  { id: "SK", label: "Saskatchewan" },
  { id: "YT", label: "Yukon" },
];


const CONDITIONS: { id: ConditionId; label: string }[] = [
  {
    id: "chronic_lung_prematurity",
    label: "Chronic lung disease of prematurity / BPD-type criteria (infant pathway)",
  },
  {
    id: "lct_retirement_resident",
    label: "LTC / retirement home / similar congregate (adult pathway)",
  },
  {
    id: "alc_hospital",
    label: "Hospital ALC / CCC / transitional care",
  },
  {
    id: "gn_immunocompromised",
    label: "GN with moderate–severe immunocompromise (ON 60–74)",
  },
  { id: "dialysis", label: "Hemodialysis or peritoneal dialysis" },
  {
    id: "transplant",
    label: "Solid organ or hematopoietic stem cell transplant recipient",
  },
  { id: "homeless", label: "Is homeless" },
  {
    id: "indigenous",
    label: "First Nations, Inuit, or Métis (ON 60–74 pathway)",
  },
  {
    id: "immunocompromised_shingles",
    label: "Immunocompromising condition (Shingrix 18+ pathway)",
  },
];

// Province + product combinations that have relevant eligibility conditions
const PROVINCE_CONDITIONS: Partial<Record<Jurisdiction, Partial<Record<VaccineProduct, ConditionId[]>>>> = {
  ON: {
    Beyfortus: ["chronic_lung_prematurity"],
    Arexvy: ["lct_retirement_resident", "alc_hospital", "gn_immunocompromised", "dialysis", "transplant", "homeless", "indigenous"],
    Abrysvo: ["lct_retirement_resident", "alc_hospital", "gn_immunocompromised", "dialysis", "transplant", "homeless", "indigenous"],
    Shingrix: ["immunocompromised_shingles"],
  },
  QC: {
    Beyfortus: [],
    Arexvy: ["transplant", "dialysis"],
    Abrysvo: ["transplant", "dialysis"],
    Shingrix: [],
  },
  NS: {
    Beyfortus: [],
    Arexvy: ["lct_retirement_resident", "alc_hospital"],
    Abrysvo: ["lct_retirement_resident", "alc_hospital"],
    Shingrix: [],
  },
  MB: {
    Shingrix: ["immunocompromised_shingles"],
    Arexvy: [],
    Abrysvo: [],
    Beyfortus: [],
  },
};

const PRODUCT_MONOGRAPH: Partial<Record<VaccineProduct, string>> = {
  Arexvy: "Health Canada approved indication: Adults 60 years of age and older (single dose).",
  Abrysvo: "Health Canada approved indication: Adults 60 years of age and older; and pregnant individuals at 24–36 weeks gestation to protect infants in the first 6 months of life.",
  Beyfortus: "Health Canada approved indication: Neonates and infants for protection during their first RSV season; children up to 24 months at increased risk of severe RSV disease in a second season.",
  Shingrix: "Health Canada approved indication: Prevention of herpes zoster (shingles) and post-herpetic neuralgia (PHN) in adults 50 years of age and older (2-dose series). Also indicated for immunocompromised adults 18 years and older.",
};

type VaccineOption = { id: string; name: string };

export function CoverageCheckForm() {
  const [vaccinesWithRules, setVaccinesWithRules] = useState<VaccineOption[]>([]);
  const [vaccineId, setVaccineId] = useState<string>("");
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("ON");
  const [product, setProduct] = useState<VaccineProduct>("Arexvy");
  const [ageYears, setAgeYears] = useState<string>("72");
  const [ageMonths, setAgeMonths] = useState<string>("");
  const [pregnant, setPregnant] = useState(false);
  const [gestationalWeeks, setGestationalWeeks] = useState<string>("");
  const [deliverRsv, setDeliverRsv] = useState(false);
  const [prevPublic, setPrevPublic] = useState(false);
  const [pedDiscussed, setPedDiscussed] = useState(false);
  const [eligibilityFactor, setEligibilityFactor] = useState<"" | ConditionId>("");

  const [result, setResult] = useState<CoverageResult | null>(null);
  const [resultSource, setResultSource] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const [showNaci, setShowNaci] = useState(false);

  const conditionIds: ConditionId[] = eligibilityFactor ? [eligibilityFactor] : [];

  const availableConditionIds =
    (PROVINCE_CONDITIONS[jurisdiction]?.[product] as ConditionId[] | undefined) ?? [];
  const filteredConditions = CONDITIONS.filter((c) =>
    (availableConditionIds as string[]).includes(c.id)
  );

  useEffect(() => {
    if (eligibilityFactor && !(availableConditionIds as string[]).includes(eligibilityFactor)) {
      setEligibilityFactor("");
    }
  }, [jurisdiction, product]);

  const parsed = useMemo(() => {
    const y = parseInt(ageYears, 10);
    const m = ageMonths.trim() === "" ? undefined : parseInt(ageMonths, 10);
    const g =
      gestationalWeeks.trim() === "" ? undefined : parseInt(gestationalWeeks, 10);
    return {
      ageYears: Number.isFinite(y) ? y : NaN,
      ageMonths: m === undefined || Number.isNaN(m) ? undefined : m,
      gestationalWeeks: g === undefined || Number.isNaN(g) ? undefined : g,
    };
  }, [ageYears, ageMonths, gestationalWeeks]);

  const resetForm = () => {
    setVaccineId("");
    setJurisdiction("ON");
    setProduct("Arexvy");
    setAgeYears("72");
    setAgeMonths("");
    setPregnant(false);
    setGestationalWeeks("");
    setDeliverRsv(false);
    setPrevPublic(false);
    setPedDiscussed(false);
    setEligibilityFactor("");
    setResult(null);
    setResultSource(null);
    setError(null);
    setShowNaci(false);
  };

  const loadVaccinesWithPublishedRules = useCallback(async () => {
    try {
      const res = await fetch("/api/coverage-check/vaccines");
      if (!res.ok) return;
      const data = (await res.json()) as VaccineOption[];
      setVaccinesWithRules(data);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    void loadVaccinesWithPublishedRules();
  }, [loadVaccinesWithPublishedRules]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") {
        void loadVaccinesWithPublishedRules();
      }
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [loadVaccinesWithPublishedRules]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResultSource(null);
    if (Number.isNaN(parsed.ageYears) || parsed.ageYears < 0) {
      setError("Enter a valid age in years (0+).");
      return;
    }
    if (product === "Beyfortus") {
      if (parsed.ageMonths === undefined) {
        setError("Beyfortus checks require infant age in months.");
        return;
      }
    }

    const body = {
      vaccineId: vaccineId || undefined,
      jurisdiction,
      product,
      ageYears: parsed.ageYears,
      ageMonths: parsed.ageMonths,
      pregnant: product === "Abrysvo" ? pregnant : undefined,
      gestationalWeeks: parsed.gestationalWeeks,
      deliverDuringRsvSeason: deliverRsv,
      previouslyReceivedPublicAdultRsv: prevPublic,
      pediatricSpecialistDiscussed: pedDiscussed,
      conditionIds,
    };

    setChecking(true);
    try {
      const res = await fetch("/api/coverage-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const j = (await res.json()) as {
        error?: string;
        source?: string;
        result?: CoverageResult;
      };
      if (!res.ok) {
        setError(j.error ?? `Request failed (${res.status})`);
        setResult(null);
        return;
      }
      if (!j.result) {
        setError("Unexpected response from server.");
        setResult(null);
        return;
      }
      setResult(j.result);
      setResultSource(j.source ?? null);
    } catch {
      setError("Network error.");
      setResult(null);
    } finally {
      setChecking(false);
    }
  };

  const outcomeStyles: Record<string, string> = {
    covered:
      "bg-emerald-100 text-emerald-950 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-100 dark:border-emerald-700",
    not_covered:
      "bg-rose-100 text-rose-950 border-rose-300 dark:bg-rose-950/40 dark:text-rose-100 dark:border-rose-700",
    conditional:
      "bg-amber-100 text-amber-950 border-amber-300 dark:bg-amber-950/40 dark:text-amber-100 dark:border-amber-700",
  };

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <form
        onSubmit={submit}
        className="space-y-6 rounded-xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-950"
      >
        {vaccinesWithRules.length === 0 ? (
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-3 text-sm text-zinc-700 dark:border-zinc-700 dark:bg-zinc-900/50 dark:text-zinc-300">
            <p className="font-medium text-zinc-900 dark:text-zinc-100">
              Using built-in reference logic only
            </p>
            <p className="mt-1 text-xs leading-relaxed">
              Custom Claude-extracted programs only appear here after a draft
              rule set is published from vaccine sources admin.
            </p>
          </div>
        ) : (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Vaccine program (optional — uses published Claude rule set)
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={vaccineId}
              onChange={(e) => setVaccineId(e.target.value)}
            >
              <option value="">Built-in reference logic only</option>
              {vaccinesWithRules.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-zinc-500">
              Only vaccines with a published rule set are listed.
            </span>
          </label>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            Province / Territory
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={jurisdiction}
              onChange={(e) => setJurisdiction(e.target.value as Jurisdiction)}
            >
              {JURISDICTIONS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Vaccine
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={product}
              onChange={(e) => setProduct(e.target.value as VaccineProduct)}
            >
              <optgroup label="RSV">
                <option value="Abrysvo">Abrysvo</option>
                <option value="Arexvy">Arexvy</option>
                <option value="Beyfortus">Beyfortus (nirsevimab)</option>
              </optgroup>
              <optgroup label="Shingles">
                <option value="Shingrix">Shingrix</option>
              </optgroup>
            </select>
          </label>
        </div>

        <div className={`grid gap-4 ${product === "Beyfortus" ? "sm:grid-cols-2" : ""}`}>
          <label className="flex flex-col gap-1 text-sm font-medium">
            Age (years)
            <input
              type="number"
              min={0}
              className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
              value={ageYears}
              onChange={(e) => setAgeYears(e.target.value)}
            />
          </label>
          {product === "Beyfortus" && (
            <label className="flex flex-col gap-1 text-sm font-medium">
              Age (months) — required for Beyfortus
              <input
                type="number"
                min={0}
                max={36}
                placeholder="e.g. 6"
                className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                value={ageMonths}
                onChange={(e) => setAgeMonths(e.target.value)}
              />
            </label>
          )}
        </div>

        {product === "Abrysvo" && (
          <div className="space-y-3 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
            <label className="flex items-center gap-2 text-sm font-medium">
              <input
                type="checkbox"
                checked={pregnant}
                onChange={(e) => setPregnant(e.target.checked)}
              />
              Pregnant (maternal Abrysvo pathway)
            </label>
            {pregnant && (
              <>
                <label className="flex flex-col gap-1 text-sm">
                  Gestational age (weeks)
                  <input
                    type="number"
                    min={0}
                    max={45}
                    className="rounded-lg border border-zinc-300 px-3 py-2 dark:border-zinc-700 dark:bg-zinc-900"
                    value={gestationalWeeks}
                    onChange={(e) => setGestationalWeeks(e.target.value)}
                  />
                </label>
                {jurisdiction === "ON" && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={deliverRsv}
                      onChange={(e) => setDeliverRsv(e.target.checked)}
                    />
                    Expected delivery during RSV season (Ontario program text)
                  </label>
                )}
              </>
            )}
          </div>
        )}

        {jurisdiction === "ON" && (product === "Arexvy" || (product === "Abrysvo" && !pregnant)) && (
          <div className="space-y-1">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={prevPublic}
                onChange={(e) => setPrevPublic(e.target.checked)}
              />
              Patient has already received a publicly funded adult RSV vaccine
            </label>
            <p className="ml-6 text-xs text-zinc-500">
              Ontario&apos;s adult RSV program funds a single dose; a prior publicly funded dose makes the patient ineligible for repeat public funding.
            </p>
          </div>
        )}

        {product === "Beyfortus" && (
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={pedDiscussed}
              onChange={(e) => setPedDiscussed(e.target.checked)}
            />
            Pediatrician / pediatric specialist discussion documented (Ontario infant program)
          </label>
        )}

        {filteredConditions.length > 0 && (
          <label className="flex flex-col gap-1 text-sm font-medium">
            Program eligibility criterion (optional)
            <select
              className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
              value={eligibilityFactor}
              onChange={(e) => {
                const v = e.target.value;
                setEligibilityFactor(v === "" ? "" : (v as ConditionId));
              }}
            >
              <option value="">None / not applicable</option>
              {filteredConditions.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
            <span className="text-xs font-normal text-zinc-500">
              Showing criteria relevant to{" "}
              {JURISDICTIONS.find((j) => j.id === jurisdiction)?.label ?? jurisdiction} for this vaccine.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={checking}
          className="w-full rounded-lg bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white"
        >
          {checking ? "Checking…" : "Check coverage"}
        </button>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </form>

      {result && (
        <div className={`space-y-4 rounded-xl border p-6 ${outcomeStyles[result.outcome]}`}>
          {resultSource && (
            <p className="text-xs font-medium opacity-80">
              Source:{" "}
              {resultSource === "published_rules"
                ? "Published extracted rules"
                : "Built-in reference logic"}
            </p>
          )}
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide opacity-80">
              Public program outcome
            </p>
            <p className="text-2xl font-bold capitalize">
              {result.outcome.replace("_", " ")}
            </p>
            {result.outcome === "not_covered" && result.declineReason && (
              <p className="mt-1 text-sm font-medium opacity-90">
                Reason: {result.declineReason}
              </p>
            )}
            <p className="mt-1 text-xs leading-relaxed opacity-80">
              &quot;Covered&quot; here means the province&apos;s criteria appear met — not
              private insurance. Rule match confidence:{" "}
              <span className="font-semibold capitalize">{result.confidence}</span>
              . See NACI text below for clinical grades where provided.
            </p>
          </div>

          {result.publicProgramPayerNote && (
            <div className="rounded-md border border-black/15 bg-white/50 p-3 text-sm dark:bg-black/25">
              <p className="text-xs font-semibold uppercase opacity-80">
                Duplicate payment check
              </p>
              <p className="mt-1">{result.publicProgramPayerNote}</p>
            </div>
          )}

          {result.naciVsHcGap && (
            <NaciVsHcGapCard gap={result.naciVsHcGap} />
          )}


          <ul className="list-inside list-disc space-y-1 text-sm">
            {result.rationale.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>

          {result.missingInformation && result.missingInformation.length > 0 && (
            <div>
              <p className="text-xs font-semibold uppercase opacity-80">
                To improve confidence
              </p>
              <ul className="mt-1 list-inside list-disc text-sm">
                {result.missingInformation.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="text-sm">
            <span className="font-semibold">Primary source: </span>
            <a
              href={result.primarySourceUrl}
              className="break-all underline"
              target="_blank"
              rel="noreferrer"
            >
              {result.primarySourceUrl}
            </a>
          </div>

          {result.supportingSourceUrls && result.supportingSourceUrls.length > 0 && (
            <div className="text-sm">
              <p className="font-semibold">Supporting references</p>
              <ul className="mt-1 list-inside list-disc">
                {result.supportingSourceUrls.map((u) => (
                  <li key={u}>
                    <a href={u} className="break-all underline" target="_blank" rel="noreferrer">
                      {u}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="border-t border-black/10 pt-3">
            <button
              type="button"
              onClick={() => setShowNaci((v) => !v)}
              className="text-xs font-semibold uppercase tracking-wide opacity-80 hover:opacity-100 underline"
            >
              {showNaci ? "Hide clinical & monograph detail" : "Show clinical & monograph detail"}
            </button>
            {showNaci && (
              <div className="mt-3 space-y-3">
                {result.naciNote ? (
                  <div>
                    <p className="text-xs font-semibold uppercase opacity-70">NACI (context)</p>
                    <p className="mt-1 text-sm">{result.naciNote}</p>
                  </div>
                ) : (
                  <p className="text-xs opacity-70">No NACI snippet for this path in the built-in rules.</p>
                )}
                <div>
                  <p className="text-xs font-semibold uppercase opacity-70">
                    Product monograph (Health Canada)
                  </p>
                  <p className="mt-1 text-sm">
                    {PRODUCT_MONOGRAPH[product] ?? "Confirm indications at the Health Canada DPD."}
                  </p>
                  <p className="mt-2 text-xs">
                    <a
                      href={SOURCES.hcDpdOnlineQuery}
                      className="break-all underline"
                      target="_blank"
                      rel="noreferrer"
                    >
                      Health Canada Drug Product Database (DPD) — confirm DIN and indications
                    </a>
                  </p>
                </div>
              </div>
            )}
          </div>

          {result.dispensingContext && (
            <div className="rounded-lg border border-black/10 bg-white/40 p-3 text-sm dark:bg-black/20">
              <p className="font-semibold">Dispensing context</p>
              <p className="mt-1">{result.dispensingContext}</p>
            </div>
          )}

          <div className="border-t border-black/10 pt-3">
            <button
              type="button"
              onClick={resetForm}
              className="text-sm font-medium underline opacity-70 hover:opacity-100"
            >
              Start new patient
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
