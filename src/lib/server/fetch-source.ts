import { createHash } from "crypto";
import { load } from "cheerio";

const MAX_TEXT = 400_000;

export function hashContent(s: string): string {
  return createHash("sha256").update(s, "utf8").digest("hex");
}

export function extractTextFromHtml(html: string): string {
  const $ = load(html);
  $("script, style, noscript, svg").remove();
  const text = $("body").length ? $("body").text() : $.root().text();
  return normalizeWhitespace(text);
}

function normalizeWhitespace(t: string): string {
  return t.replace(/\s+/g, " ").trim();
}

async function extractPdfText(
  buffer: ArrayBuffer
): Promise<{ text: string; error?: string }> {
  try {
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      return { text: normalizeWhitespace(result.text ?? "") };
    } finally {
      await parser.destroy();
    }
  } catch (e) {
    return {
      text: "",
      error: e instanceof Error ? e.message : "PDF parse failed",
    };
  }
}

export type FetchSourceResult = {
  ok: boolean;
  httpStatus?: number;
  contentType?: string;
  finalUrl: string;
  extractedText: string;
  contentHash: string;
  errorMessage?: string;
};

export async function fetchSourceUrl(url: string): Promise<FetchSourceResult> {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 45_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        "user-agent": "VaxTrackSourceMonitor/1.0",
        accept: "text/html,application/pdf;q=0.9,*/*;q=0.8",
      },
    });
    const finalUrl = res.url;
    const httpStatus = res.status;
    const contentType = res.headers.get("content-type") ?? undefined;
    const buf = await res.arrayBuffer();

    if (!res.ok) {
      return {
        ok: false,
        finalUrl,
        httpStatus,
        contentType,
        extractedText: "",
        contentHash: hashContent(`err:${httpStatus}:${finalUrl}`),
        errorMessage: `HTTP ${httpStatus}`,
      };
    }

    let extractedText = "";
    let errorMessage: string | undefined;

    const looksPdf =
      contentType?.toLowerCase().includes("pdf") ||
      finalUrl.toLowerCase().split("?")[0].endsWith(".pdf");

    if (looksPdf) {
      const r = await extractPdfText(buf);
      extractedText = r.text;
      if (r.error) errorMessage = r.error;
      if (!extractedText && r.error) {
        return {
          ok: false,
          httpStatus,
          contentType,
          finalUrl,
          extractedText: "",
          contentHash: hashContent(`pdf-fail:${finalUrl}`),
          errorMessage: r.error,
        };
      }
    } else {
      const html = new TextDecoder("utf-8", { fatal: false }).decode(buf);
      extractedText = extractTextFromHtml(html);
    }

    if (extractedText.length > MAX_TEXT) {
      extractedText =
        extractedText.slice(0, MAX_TEXT) + "\n...[truncated by VaxTrack]";
    }

    const contentHash = hashContent(extractedText);

    return {
      ok: true,
      httpStatus,
      contentType,
      finalUrl,
      extractedText,
      contentHash,
      errorMessage,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return {
      ok: false,
      finalUrl: url,
      extractedText: "",
      contentHash: hashContent(`network:${msg}`),
      errorMessage: msg,
    };
  } finally {
    clearTimeout(t);
  }
}
