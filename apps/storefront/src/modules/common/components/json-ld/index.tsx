import {
  jsonLdSzoveg,
  type JsonLd as JsonLdAdat,
} from "@lib/seo/strukturalt-adat"

/**
 * EGY JSON-LD BLOKK A KISZOLGALT HTML-BEN (FE-2a). Szerver komponens: a
 * kereso az elso HTML-ben latja, nem a kliens renderelese utan. Ures adatra
 * semmit nem ir.
 */
export default function JsonLd({ adat }: { adat: JsonLdAdat | null }) {
  if (!adat) return null
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: jsonLdSzoveg(adat) }}
    />
  )
}
