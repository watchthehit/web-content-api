/**
 * Shared scraper utilities
 * Lightweight fetch + parse helpers. No browser needed.
 */

import * as cheerio from "cheerio";

const USER_AGENT =
  "Mozilla/5.0 (compatible; WebContentAPI/1.0; +https://github.com/web-content-api)";

const FETCH_TIMEOUT = 10_000;

/**
 * Fetch a URL and return the HTML string.
 */
export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

  try {
    const resp = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "text/html,application/xhtml+xml,*/*",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: controller.signal,
      redirect: "follow",
    });

    if (!resp.ok) {
      throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
    }

    return await resp.text();
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Load HTML into cheerio for parsing.
 */
export function parseHtml(html: string) {
  return cheerio.load(html);
}

/**
 * Extract basic metadata from HTML using cheerio.
 */
export function extractMeta($: cheerio.CheerioAPI): {
  title: string;
  description: string;
  ogImage: string;
} {
  const title =
    $('meta[property="og:title"]').attr("content") ||
    $("title").first().text().trim() ||
    "";

  const description =
    $('meta[property="og:description"]').attr("content") ||
    $('meta[name="description"]').attr("content") ||
    "";

  const ogImage =
    $('meta[property="og:image"]').attr("content") || "";

  return { title, description, ogImage };
}
