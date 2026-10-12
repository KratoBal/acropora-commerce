import type { MerchantItem } from "./merchant-feed-item"

/**
 * THE XML TRANSPORT (SEO P1-13, plan C11): the mapper's items as a Google
 * Merchant RSS 2.0 feed, every field in the `g:` namespace. It serializes and
 * nothing else: what an item says is decided in `merchant-feed-item.ts`.
 */
export function merchantFeedXml(
  items: readonly MerchantItem[],
  channel: { title: string; link: string; description: string }
): string {
  const lines = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">',
    "<channel>",
    `<title>${escapeXml(channel.title)}</title>`,
    `<link>${escapeXml(channel.link)}</link>`,
    `<description>${escapeXml(channel.description)}</description>`,
  ]
  for (const item of items) {
    lines.push("<item>")
    for (const [key, value] of Object.entries(item)) {
      for (const one of Array.isArray(value) ? value : [value]) {
        if (one === undefined || one === null || one === "") continue
        lines.push(`<g:${key}>${escapeXml(String(one))}</g:${key}>`)
      }
    }
    lines.push("</item>")
  }
  lines.push("</channel>", "</rss>")
  return lines.join("\n") + "\n"
}

export function escapeXml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
}
