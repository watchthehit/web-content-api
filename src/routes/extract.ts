/**
 * /api/extract — URL → clean text content
 *
 * Fetches a URL, strips HTML, extracts the article text
 * using Mozilla's Readability (same engine as Firefox Reader Mode).
 */

import { Router, type Request, type Response } from "express";
import { Readability } from "@mozilla/readability";
import { parseHTML } from "linkedom";
import { fetchHtml, parseHtml, extractMeta } from "../lib/scraper.js";

export const extractRouter = Router();

extractRouter.get("/api/extract", async (req: Request, res: Response) => {
  const url = req.query.url as string;

  if (!url) {
    res.status(400).json({ error: "Missing ?url= parameter" });
    return;
  }

  try {
    new URL(url);
  } catch {
    res.status(400).json({ error: "Invalid URL" });
    return;
  }

  try {
    const html = await fetchHtml(url);
    const $ = parseHtml(html);
    const meta = extractMeta($);

    // Use linkedom to create a DOM for Readability
    const { document } = parseHTML(html);
    const reader = new Readability(document);
    const article = reader.parse();

    const text = article?.textContent?.trim() || $.root().text().trim();
    const title = article?.title || meta.title;

    res.json({
      url,
      title,
      description: meta.description,
      text: text.slice(0, 50_000), // Cap at 50k chars
      wordCount: text.split(/\s+/).length,
      excerpt: article?.excerpt || meta.description,
      siteName: article?.siteName || "",
    });
  } catch (err: any) {
    res.status(502).json({
      error: "Failed to extract content",
      detail: err.message,
      url,
    });
  }
});
