/**
 * Registry of sources that the scraper monitors for changes.
 *
 * Keys reference entries in src/lib/coverage/sources.ts. We deliberately do
 * NOT track every reference URL — CDC pages, partnership orgs, and CIG
 * reference articles change rarely and aren't payer-critical. Focus is on
 * provincial program pages (rule-impacting) and HC/NACI clinical sources
 * (eligibility-impacting).
 */
import { SOURCES } from "@/lib/coverage/sources";

export type SourceCategory =
  | "provincial_rsv"
  | "provincial_shingles"
  | "provincial_covid"
  | "provincial_hpv"
  | "hc_monograph"
  | "naci"
  | "cig";

export interface TrackedSource {
  /** Stable key — also used as the snapshot filename. */
  key: string;
  /** Live URL. */
  url: string;
  /** Human-readable label for issue titles. */
  label: string;
  /** Vaccine family (helps group issues / route to a reviewer). */
  category: SourceCategory;
  /** Optional: a CSS selector to narrow content extraction (default: <main>). */
  contentSelector?: string;
}

export const TRACKED_SOURCES: TrackedSource[] = [
  // ── Provincial RSV ─────────────────────────────────────────────────────────
  { key: "onPrograms", url: SOURCES.onPrograms, label: "Ontario RSV programs", category: "provincial_rsv" },
  { key: "qcPiq", url: SOURCES.qcPiq, label: "Quebec PIQ — RSV", category: "provincial_rsv" },
  { key: "nsAdultFaq", url: SOURCES.nsAdultFaq, label: "Nova Scotia RSV FAQ", category: "provincial_rsv" },
  { key: "abRsv", url: SOURCES.abRsv, label: "Alberta RSV program", category: "provincial_rsv" },
  { key: "bcRsv", url: SOURCES.bcRsv, label: "BC HealthLink — RSV", category: "provincial_rsv" },
  { key: "mbRsv", url: SOURCES.mbRsv, label: "Manitoba RSV eligibility", category: "provincial_rsv" },
  { key: "nbRsv", url: SOURCES.nbRsv, label: "New Brunswick RSV program", category: "provincial_rsv" },
  { key: "nlRsv", url: SOURCES.nlRsv, label: "Newfoundland & Labrador RSV announcement", category: "provincial_rsv" },
  { key: "peRsv", url: SOURCES.peRsv, label: "PEI RSV announcement", category: "provincial_rsv" },
  { key: "skRsv", url: SOURCES.skRsv, label: "Saskatchewan RSV (Lung Sask)", category: "provincial_rsv" },
  { key: "ntRsv", url: SOURCES.ntRsv, label: "NWT immunization schedule (incl. RSV)", category: "provincial_rsv" },
  { key: "nuRsv", url: SOURCES.nuRsv, label: "Nunavut RSV PSA", category: "provincial_rsv" },
  { key: "ytRsv", url: SOURCES.ytRsv, label: "Yukon RSV (YIP Manual §8)", category: "provincial_rsv" },

  // ── Provincial Shingles ────────────────────────────────────────────────────
  { key: "onShingles", url: SOURCES.onShingles, label: "Ontario shingles vaccine", category: "provincial_shingles" },
  { key: "qcShingles", url: SOURCES.qcShingles, label: "Quebec PIQ — shingles", category: "provincial_shingles" },
  { key: "nsShingles", url: SOURCES.nsShingles, label: "Nova Scotia shingles HCP info", category: "provincial_shingles" },
  { key: "abShingles", url: SOURCES.abShingles, label: "Alberta shingles (MyHealth AB)", category: "provincial_shingles" },
  { key: "bcShingles", url: SOURCES.bcShingles, label: "BC HealthLink — shingles", category: "provincial_shingles" },
  { key: "mbShingles", url: SOURCES.mbShingles, label: "Manitoba shingles", category: "provincial_shingles" },
  { key: "nbShingles", url: SOURCES.nbShingles, label: "New Brunswick pharmacy shingles", category: "provincial_shingles" },
  { key: "nlShingles", url: SOURCES.nlShingles, label: "NL shingles expansion (Aug 2025)", category: "provincial_shingles" },
  { key: "peShingles", url: SOURCES.peShingles, label: "PEI shingles 50+ expansion", category: "provincial_shingles" },
  { key: "skShingles", url: SOURCES.skShingles, label: "Saskatchewan immunization services", category: "provincial_shingles" },
  { key: "ytShingles", url: SOURCES.ytShingles, label: "Yukon shingles", category: "provincial_shingles" },

  // ── Provincial COVID ───────────────────────────────────────────────────────
  { key: "onCovid", url: SOURCES.onCovid, label: "Ontario COVID-19 vaccines", category: "provincial_covid" },
  { key: "onCovidMohHcpFactSheet2025", url: SOURCES.onCovidMohHcpFactSheet2025, label: "Ontario MOH COVID HCP fact sheet", category: "provincial_covid" },
  { key: "qcCovid", url: SOURCES.qcCovid, label: "Quebec PIQ — COVID", category: "provincial_covid" },
  { key: "nsCovid", url: SOURCES.nsCovid, label: "Nova Scotia coronavirus vaccine", category: "provincial_covid" },
  { key: "abCovid", url: SOURCES.abCovid, label: "Alberta Blue Cross COVID updates", category: "provincial_covid" },
  { key: "bcCovid", url: SOURCES.bcCovid, label: "BC COVID immunization", category: "provincial_covid" },
  { key: "mbCovid", url: SOURCES.mbCovid, label: "Manitoba COVID vaccine", category: "provincial_covid" },
  { key: "nbCovid", url: SOURCES.nbCovid, label: "New Brunswick SARS-CoV-2 vaccines", category: "provincial_covid" },
  { key: "nlCovid", url: SOURCES.nlCovid, label: "NL COVID immunization plan", category: "provincial_covid" },
  { key: "peCovid", url: SOURCES.peCovid, label: "PEI getting the vaccine", category: "provincial_covid" },
  { key: "skCovid", url: SOURCES.skCovid, label: "Saskatchewan COVID immunization eligibility", category: "provincial_covid" },
  { key: "ntCovid", url: SOURCES.ntCovid, label: "NWT COVID services", category: "provincial_covid" },
  { key: "nuCovid", url: SOURCES.nuCovid, label: "Nunavut influenza & COVID", category: "provincial_covid" },
  { key: "ytCovid", url: SOURCES.ytCovid, label: "Yukon COVID immunization", category: "provincial_covid" },

  // ── Provincial HPV ─────────────────────────────────────────────────────────
  { key: "onHpv", url: SOURCES.onHpv, label: "Ontario HPV vaccine", category: "provincial_hpv" },
  { key: "qcHpv", url: SOURCES.qcHpv, label: "Quebec PIQ — HPV", category: "provincial_hpv" },
  { key: "nsHpv", url: SOURCES.nsHpv, label: "Nova Scotia HPV", category: "provincial_hpv" },
  { key: "abHpv", url: SOURCES.abHpv, label: "Alberta HPV-9 (MyHealth AB)", category: "provincial_hpv" },
  { key: "bcHpv", url: SOURCES.bcHpv, label: "BC HealthLink — HPV", category: "provincial_hpv" },
  { key: "mbHpv", url: SOURCES.mbHpv, label: "Manitoba HPV factsheet PDF", category: "provincial_hpv" },
  { key: "nbHpv", url: SOURCES.nbHpv, label: "New Brunswick HPV", category: "provincial_hpv" },
  { key: "nlHpv", url: SOURCES.nlHpv, label: "NL HPV (Partnership)", category: "provincial_hpv" },
  { key: "peHpv", url: SOURCES.peHpv, label: "PEI HPV-9 fact sheet", category: "provincial_hpv" },
  { key: "skHpv", url: SOURCES.skHpv, label: "Saskatchewan HPV (SaskCancer)", category: "provincial_hpv" },
  { key: "ntHpv", url: SOURCES.ntHpv, label: "NWT HPV", category: "provincial_hpv" },
  { key: "nuHpv", url: SOURCES.nuHpv, label: "Nunavut HPV PSA (PDF)", category: "provincial_hpv" },
  { key: "ytHpv", url: SOURCES.ytHpv, label: "Yukon school-based immunization", category: "provincial_hpv" },

  // ── Health Canada monographs ───────────────────────────────────────────────
  { key: "hcAbrysvo", url: SOURCES.hcAbrysvo, label: "HC monograph — Abrysvo", category: "hc_monograph" },
  { key: "hcArexvy", url: SOURCES.hcArexvy, label: "HC monograph — Arexvy", category: "hc_monograph" },
  { key: "hcBeyfortus", url: SOURCES.hcBeyfortus, label: "HC DPD — Beyfortus", category: "hc_monograph" },
  { key: "hcShingrix", url: SOURCES.hcShingrix, label: "HC monograph — Shingrix", category: "hc_monograph" },
  { key: "hcCovidSpikevax", url: SOURCES.hcCovidSpikevax, label: "HC monograph — Spikevax", category: "hc_monograph" },
  { key: "hcCovidMNEXSPIKE", url: SOURCES.hcCovidMNEXSPIKE, label: "HC monograph — mNEXSPIKE", category: "hc_monograph" },
  { key: "hcCovidNUVAXOVID", url: SOURCES.hcCovidNUVAXOVID, label: "HC monograph — NUVAXOVID", category: "hc_monograph" },
  { key: "hcHpvGardasil", url: SOURCES.hcHpvGardasil, label: "HC monograph — Gardasil 9", category: "hc_monograph" },
  { key: "hcHpvCervarix", url: SOURCES.hcHpvCervarix, label: "HC monograph — Cervarix", category: "hc_monograph" },

  // ── NACI statements ────────────────────────────────────────────────────────
  { key: "naciOlderAdults", url: SOURCES.naciOlderAdults, label: "NACI — RSV older adults", category: "naci" },
  { key: "naciRsvSummary", url: SOURCES.naciRsvSummary, label: "NACI — RSV summary (HTML)", category: "naci" },
  { key: "naciShingles", url: SOURCES.naciShingles, label: "NACI — shingles (immunocompromised 2025)", category: "naci" },
  { key: "naciShinglesSummary", url: SOURCES.naciShinglesSummary, label: "NACI — shingles summary (HTML)", category: "naci" },
  { key: "naciCovidPdf", url: SOURCES.naciCovidPdf, label: "NACI — COVID 2025/2026 (PDF)", category: "naci" },
  { key: "naciCovidSummaryHtml", url: SOURCES.naciCovidSummaryHtml, label: "NACI — COVID summary (HTML)", category: "naci" },
  { key: "naciHpvPdf", url: SOURCES.naciHpvPdf, label: "NACI — HPV (PDF)", category: "naci" },
  { key: "naciHpvSummaryHtml", url: SOURCES.naciHpvSummaryHtml, label: "NACI — HPV summary (HTML)", category: "naci" },

  // ── CIG (Canadian Immunization Guide) ──────────────────────────────────────
  { key: "cigShingles", url: SOURCES.cigShingles, label: "CIG — herpes zoster", category: "cig" },
  { key: "cigCovid", url: SOURCES.cigCovid, label: "CIG — COVID-19", category: "cig" },
  { key: "cigHpv", url: SOURCES.cigHpv, label: "CIG — HPV", category: "cig" },
];
