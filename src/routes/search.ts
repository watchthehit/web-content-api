/**
 * /api/search — query → structured search results
 *
 * Scrapes DuckDuckGo HTML search (no API key needed).
 * Returns structured results with title, URL, and snippet.
 */

import { Router, type Request, type Response } from "express";
import { fetchHtml, parseHtml } from "../lib/scraper.js";

export const searchRouter = Router();

const DDG_URL = "https://html.duckduckgo.com/html/";

searchRouter.get("/api/search", async (req: Request, res: Response) => {
  const q = req.query.q as string;
  const limit = Math.min(parseInt(req.query.limit as string) || 10, 20);

  if (!q) {
    res.status(400).json({ error: "Missing ?q= parameter" });
    return;
  }

  try {
    const params = new URLSearchParams({ q });
    const html = await fetchHtml(`${DDG_URL}?${params}`);
    const $ = parseHtml(html);

    const results: { title: string; url: string; snippet: string }[] = [];

    $(".result").each((_i, el) => {
      if (results.length >= limit) return false;

      const $el = $(el);
      const linkEl = $el.find(".result__a").first();
      const title = linkEl.text().trim();
      const href = linkEl.attr("href") || "";
      const snippet = $el.find(".result__snippet").text().trim();

      // DDG wraps URLs in a redirect — extract the actual URL
      let url = href;
      try {
        const parsed = new URL(href, "https://duckduckgo.com");
        url = parsed.searchParams.get("uddg") || href;
      } catch {
        // Use href as-is
      }

      if (title && url) {
        results.push({ title, url, snippet });
      }
    });

    res.json({
      query: q,
      results,
      count: results.length,
    });
  } catch (err: any) {
    res.status(502).json({
      error: "Search failed",
      detail: err.message,
      query: q,
    });
  }
});
