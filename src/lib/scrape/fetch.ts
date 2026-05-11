/**
 * Fetch a URL and return cleaned, comparable text content.
 *
 * - HTML: parse with cheerio, strip script/style/nav/footer, return text of <main>
 *   (or body fallback), collapsed whitespace.
 * - PDF: parse with pdf-parse, return raw text.
 * - Other: return raw text (no extraction).
 *
 * Returns either a successful FetchResult or an error sentinel. We never throw
 * for predictable network failures so the runner can keep going through the
 * full source list.
 */
import * as cheerio from "cheerio";
import { Agent } from "undici";

/**
 * Undici dispatcher that tolerates self-signed / chain-incomplete TLS. Used
 * only for outbound reads of public government pages where the cert chain
 * sometimes references intermediate CAs Node doesn't ship. We are not sending
 * credentials or trusting responses for execution, only reading published text.
 */
const PERMISSIVE_DISPATCHER = new Agent({
  connect: { rejectUnauthorized: false },
});

// pdf-parse 2.x exposes a PDFParse class.

export type FetchResult =
  | {
      ok: true;
      finalUrl: string;
      contentType: "html" | "pdf" | "text";
      text: string;
      httpStatus: number;
    }
  | {
      ok: false;
      finalUrl?: string;
      httpStatus?: number;
      error: string;
    };

// Use a browser-ish UA. Some provincial sites return 403 to non-browser
// agents; we still identify ourselves via the comment chain in the
// referer/About if a site asks.
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36 VaxTrack-Scraper/0.1";

const FETCH_TIMEOUT_MS = 30_000;

export async function fetchSource(
  url: string,
  selector?: string
): Promise<FetchResult> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const res = await fetchWithFallback(url, controller.signal);

    if (!res.ok) {
      return {
        ok: false,
        httpStatus: res.status,
        finalUrl: res.url,
        error: `HTTP ${res.status}`,
      };
    }

    const contentType = res.headers.get("content-type")?.toLowerCase() ?? "";
    const finalUrl = res.url;

    if (contentType.includes("pdf") || url.toLowerCase().endsWith(".pdf")) {
      const buf = Buffer.from(await res.arrayBuffer());
      // pdf-parse 2.x exposes a PDFParse class.
      const { PDFParse } = await import("pdf-parse");
      const parser = new PDFParse({ data: buf });
      const parsed = await parser.getText();
      const text =
        // Different builds expose .text vs .pages[].text.
        (parsed as { text?: string }).text ??
        ((parsed as { pages?: { text?: string }[] }).pages?.map((p) => p.text ?? "").join("\n\n") ?? "");
      return {
        ok: true,
        finalUrl,
        httpStatus: res.status,
        contentType: "pdf",
        text: normalizeWhitespace(text),
      };
    }

    if (
      contentType.includes("html") ||
      contentType.includes("xml") ||
      contentType === ""
    ) {
      const html = await res.text();
      return {
        ok: true,
        finalUrl,
        httpStatus: res.status,
        contentType: "html",
        text: extractHtmlText(html, selector),
      };
    }

    const txt = await res.text();
    return {
      ok: true,
      finalUrl,
      httpStatus: res.status,
      contentType: "text",
      text: normalizeWhitespace(txt),
    };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Extract human-readable text from HTML, dropping boilerplate that changes for
 * non-substantive reasons (navigation, footer, "last updated" timestamps).
 */
export function extractHtmlText(html: string, selector?: string): string {
  const $ = cheerio.load(html);

  // Remove noise that produces churn without changing the program substance.
  [
    "script",
    "style",
    "noscript",
    "nav",
    "header",
    "footer",
    "iframe",
    "form",
    ".sr-only",
    "[aria-hidden='true']",
    "[role='navigation']",
    "[role='banner']",
    "[role='contentinfo']",
  ].forEach((sel) => $(sel).remove());

  // Prefer the explicit selector, then <main>, then <article>, then body.
  const root =
    (selector && $(selector).length ? $(selector) : null) ??
    ($("main").length ? $("main") : null) ??
    ($("article").length ? $("article") : null) ??
    $("body");

  return normalizeWhitespace(root.text());
}

/**
 * Try a default-TLS fetch first; if it errors out with a chain issue, retry
 * with the permissive dispatcher. This keeps verification ON for sites that
 * work normally and only relaxes for the handful with broken CA chains.
 */
async function fetchWithFallback(url: string, signal: AbortSignal): Promise<Response> {
  const headers = {
    "User-Agent": USER_AGENT,
    Accept:
      "text/html,application/xhtml+xml,application/pdf,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-CA,en;q=0.9,fr-CA;q=0.7,fr;q=0.6",
  };
  try {
    return await fetch(url, { redirect: "follow", headers, signal });
  } catch (err) {
    const code = (err as { cause?: { code?: string } }).cause?.code;
    const chainIssue = code === "UNABLE_TO_GET_ISSUER_CERT_LOCALLY" ||
      code === "SELF_SIGNED_CERT_IN_CHAIN" ||
      code === "CERT_HAS_EXPIRED" ||
      code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE";
    if (!chainIssue) throw err;
    // Retry permissive — we're reading public pages, not authenticating.
    return await fetch(url, {
      redirect: "follow",
      headers,
      signal,
      // @ts-expect-error: undici accepts dispatcher in Node fetch, not in lib.dom types
      dispatcher: PERMISSIVE_DISPATCHER,
    });
  }
}

function normalizeWhitespace(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
