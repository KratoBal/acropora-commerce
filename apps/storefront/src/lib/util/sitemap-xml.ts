import type { SitemapBejegyzes } from "./sitemap-bejegyzesek"

/**
 * A SITEMAP XML-JE, TISZTA FUGGVENYKENT (FE-5). Az `app/sitemap.ts` eddig a
 * Next sajat sorositojat hasznalta; a tipusonkenti bontas es az index kulon
 * route-kezelot kert, es azok mar maguk adjak az XML-t. A sorositas itt all,
 * hogy egysegteszttel merheto legyen (a route-ok a `next/headers`-t olvassak).
 */
const XML_FEJ = '<?xml version="1.0" encoding="UTF-8"?>'
const NS = "http://www.sitemaps.org/schemas/sitemap/0.9"

export function xmlSzoveg(ertek: string): string {
  return ertek
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}

export function urlsetXml(bejegyzesek: readonly SitemapBejegyzes[]): string {
  const sorok = bejegyzesek.map(
    (b) =>
      `<url><loc>${xmlSzoveg(b.url)}</loc>${
        b.lastModified
          ? `<lastmod>${b.lastModified.toISOString()}</lastmod>`
          : ""
      }</url>`,
  )
  return `${XML_FEJ}\n<urlset xmlns="${NS}">\n${sorok.join("\n")}\n</urlset>\n`
}

export function sitemapIndexXml(cimek: readonly string[]): string {
  const sorok = cimek.map(
    (c) => `<sitemap><loc>${xmlSzoveg(c)}</loc></sitemap>`,
  )
  return `${XML_FEJ}\n<sitemapindex xmlns="${NS}">\n${sorok.join("\n")}\n</sitemapindex>\n`
}

export const XML_FEJLECEK = {
  "Content-Type": "application/xml; charset=utf-8",
} as const
