import sanitizeHtml from "sanitize-html"

/**
 * A SZERKESZTHETO LABLEC BEMUTATKOZASA (`footer.intro`) HTML-KENT RAJZOLODIK, DE
 * SOHA NYERSEN. Az OS mentes elott tisztitja a kozos "full" profiljan, a bolt
 * validatora csak a hosszat nezi, a lap pedig a SAJAT tisztitasan viszi at
 * (elonezet-protokoll v1: "a kirakat ezt NE vegye adottnak"). Egy rossz
 * rekord (vagy egy mas utvonalon bekerult) nem lehet XSS a lablecen, ami MINDEN
 * lapon ott all.
 *
 * AMIT ENGED: bekezdes, sortores, felkover, dolt, felsorolas, kis cimsor, es a
 * link, ha http(s) vagy bolti ut. Semmi mas: nincs `style`, `class`, kep,
 * keret, szkript, `on*`. A kulso link `rel`-t kap.
 */
const BOLTI_UT = /^\/(?![/\\])[^\s\\]*$/

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "ul",
    "ol",
    "li",
    "h3",
    "h4",
    "a",
  ],
  allowedAttributes: { a: ["href", "rel"] },
  allowedSchemes: ["http", "https"],
  allowedSchemesAppliedToAttributes: ["href"],
  allowProtocolRelative: false,
  // nem engedett elem TARTALMA marad (a szoveg), a szkript/stilus elem tartalma is elesik
  disallowedTagsMode: "discard",
  nonTextTags: ["script", "style", "textarea", "option", "noscript"],
  transformTags: {
    a: (tagName, attribs) => {
      const href = attribs.href ?? ""
      // bolti ut (nincs seme) a sanitize-html szerint relativ cim: marad; a
      // `//host` es a `\\` alak itt kiesik
      if (href && !/^https?:\/\//i.test(href) && !BOLTI_UT.test(href))
        return { tagName: "span", attribs: {} }
      return {
        tagName,
        attribs: {
          href,
          ...(/^https?:\/\//i.test(href) ? { rel: "noopener noreferrer" } : {}),
        },
      }
    },
  },
}

export function lablecHtml(html: string | null | undefined): string {
  return sanitizeHtml(html ?? "", OPTIONS).trim()
}
