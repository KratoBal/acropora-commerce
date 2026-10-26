import sanitizeHtml from "sanitize-html"

/**
 * A "ROVID" FORMAZOTT SZOVEG TISZTITASA (Balazs 2b megbizas, 4. pont:
 * "Formazott szovegek"; nautilus 36040). A kotott helyeken (a kezdolap
 * bevezeto es lepes-szovegei, a hero-dia szovege) az OS a kozos tisztito
 * "short" profiljan atvitt HTML-t tarol: p, br, strong, em, a[href], ul, ol, li,
 * semmi mas. A kirakat ezt NEM veszi adottnak: a SAJAT tisztitasan viszi at, es
 * csak a tisztitott kimenetet rajzolja HTML-kent.
 *
 * SZERVEROLDALI MODUL: a `sanitize-html` nem a bongeszo-csomagba valo. A
 * kliens (az OS elo elonezete) a tisztitott rekordot a szerverrol kapja
 * (`tisztitas.ts`), sosem tisztit maga.
 *
 * A link csak http(s) vagy bolti ut lehet (egy per, nem `//host`, nem `\`); a
 * kulso link `rel`-t kap; `style`, `class`, kep, keret, szkript nincs.
 */
const BOLTI_UT = /^\/(?![/\\])[^\s\\]*$/

export function rovidHtml(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: ["p", "br", "strong", "b", "em", "i", "ul", "ol", "li", "a"],
    allowedAttributes: { a: ["href", "rel"] },
    allowedSchemes: ["http", "https"],
    allowedSchemesAppliedToAttributes: ["href"],
    allowProtocolRelative: false,
    transformTags: {
      a: (tagName, attribs) => {
        const href = attribs.href ?? ""
        if (href && !/^https?:\/\//i.test(href) && !BOLTI_UT.test(href))
          return { tagName: "span", attribs: {} }
        return {
          tagName,
          attribs: {
            href,
            ...(/^https?:\/\//i.test(href)
              ? { rel: "noopener noreferrer" }
              : {}),
          },
        }
      },
    },
  }).trim()
}
