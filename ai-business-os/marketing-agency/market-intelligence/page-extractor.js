"use strict";

function decodeEntities(value) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function extractPageContent(html) {
  if (typeof html !== "string") {
    throw new Error("INVALID_PAGE_HTML");
  }

  if (html.length > 600000) {
    throw new Error("PAGE_HTML_TOO_LARGE");
  }

  const titleMatch = html.match(
    /<title\b[^>]*>([\s\S]*?)<\/title>/i
  );

  const descriptionMatch = html.match(
    /<meta\b(?=[^>]*\bname=["']description["'])(?=[^>]*\bcontent=["']([^"']*)["'])[^>]*>/i
  );

  const cleaned = html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return {
    title: titleMatch
      ? decodeEntities(titleMatch[1].trim()).slice(0, 300)
      : null,
    description: descriptionMatch
      ? decodeEntities(descriptionMatch[1].trim()).slice(0, 1000)
      : null,
    text: decodeEntities(cleaned).slice(0, 20000),
    status: "extracted",
    verified: false
  };
}

module.exports = {
  extractPageContent
};
