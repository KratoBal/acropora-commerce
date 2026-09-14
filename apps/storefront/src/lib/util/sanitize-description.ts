import sanitizeHtml from "sanitize-html"

/**
 * The product descriptions come from the old shop, where people edit them by
 * hand. They arrive as HTML, so the product page must render them as HTML --
 * but foreign HTML is never inserted raw.
 *
 * Every list below is DERIVED FROM THE DATA, not guessed. Measured on the
 * 2026-09-02 UNAS export (1522 products carrying a description object; the
 * `Short` field on 1390 of them and `Long` on 348), with the fixtures kept at
 * agents/nautilus/measurement/leiras-fixturak/ so the numbers stay checkable.
 *
 * What the measurement found in today's data:
 *
 *   <script>, inline on* handlers, javascript: URLs, <object>, <embed>
 *   and data:text/html            zero occurrences
 *   <iframe>                      27 products, every src on www.youtube.com
 *   markup shapes                 37 distinct tags
 *
 * Zero executable content today does NOT make this redundant: it says we are
 * building a guard against tomorrow's edits rather than patching a hole that
 * is open right now.
 */

/**
 * The 10 CSS properties that survive from the export's style attributes.
 *
 * The style attribute is kept because 189 products carry their technical
 * specifications in tables (5362 td and 2655 tr style attributes); without it
 * those tables collapse into one run of text. But "keep style" and "keep any
 * style" are different promises: none of the properties below can position an
 * element over the page or load a URL, and anything not listed is dropped.
 *
 * `background-color` USED TO BE ON THIS LIST AND IS DELIBERATELY GONE.
 *
 * The reason is not safety, it is that the stored value was chosen for a page
 * we no longer serve. Measured 2026-09-14 over the 1494 stage products: 152 of
 * them carry 1052 background-color declarations, and 1050 of those are the
 * single value #d9d9d9 -- the grey zebra stripe of the old shop's white page.
 * Our product pages carry their own world (`data-vilag`): a livestock page is
 * dark, a technical page is light, and the person who typed #d9d9d9 years ago
 * could not know which one it would land on. Measured on the served page, the
 * result of that mismatch was a light grey band under oklch(0.72) text on an
 * oklch(0.17) page -- roughly 1.7:1 contrast, which is what Balázs saw and
 * called out ("az élőlényeknek ez így nem jó, mindenhol a sötét kellene",
 * 2026-09-14 11:25).
 *
 * The stripe itself is not lost: it moves to `.leiras-tartalom` in globals.css,
 * where it is drawn from `--terv-hatter-halvany` and therefore follows the
 * world of the page. What is dropped is the hard-coded colour, not the banding.
 *
 * TWO NON-ZEBRA VALUES GO WITH IT, and naming them is the honest part: one
 * #003366 heading band and one #ffff00 warning highlight, one product each.
 * Their text stays; only their fill goes. A rule that kept them would have to
 * ask which greys are zebra and which are intent, and that question has no
 * answer in the data.
 */
const ALLOWED_STYLES = {
  "*": {
    width: [/^\d+(\.\d+)?(px|%|em|rem)$/],
    height: [/^\d+(\.\d+)?(px|%|em|rem)$/],
    color: [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
    "caret-color": [/^#[0-9a-f]{3,8}$/i, /^[a-z]+$/i],
    "font-weight": [/^(\d{3}|normal|bold|bolder|lighter)$/i],
    "font-size": [/^\d+(\.\d+)?(px|%|em|rem|pt)$/],
    "font-family": [/^[\w\s,'"-]+$/],
    "text-decoration": [/^[a-z\s-]+$/i],
    "text-align": [/^(left|right|center|justify)$/i],
    "border-collapse": [/^(collapse|separate)$/i],
  },
}

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // text
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "span",
    "sup",
    "sub",
    "pre",
    // headings -- h1 through h5 all occur
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    // lists
    "ul",
    "ol",
    "li",
    // tables: the single most important group, 189 products depend on them
    "table",
    "thead",
    "tbody",
    "tfoot",
    "tr",
    "th",
    "td",
    // structure
    "div",
    "section",
    "article",
    "blockquote",
    "figure",
    "figcaption",
    "hr",
    // links, images and embedded video, each narrowed below
    "a",
    "img",
    "iframe",
  ],
  // <meta> is dropped deliberately. It occurs 1563 times across 431 description
  // fields (400 products) as a leftover <meta charset> at the start of the text,
  // and it means nothing inside a product description. The source-side pollution
  // itself is a migration question and is tracked separately.
  allowedAttributes: {
    "*": ["style", "class"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: [
      "src",
      "width",
      "height",
      "title",
      "allow",
      "allowfullscreen",
      "frameborder",
    ],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    table: ["border", "cellpadding", "cellspacing"],
  },
  allowedStyles: ALLOWED_STYLES,
  // Only http and https survive on any URL-bearing attribute. javascript: is
  // absent from today's data -- this is the place a future edit would come in.
  allowedSchemes: ["http", "https"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // The export writes protocol-relative sources (//www.youtube.com/embed/...),
  // so this must stay on or every embedded video would be dropped.
  allowProtocolRelative: true,
  // A narrow and measured concession: all 27 embedded videos are YouTube, and an
  // iframe pointing anywhere else does not get through.
  allowedIframeHostnames: [
    "www.youtube.com",
    "youtube.com",
    "www.youtube-nocookie.com",
  ],
  // A description is not trusted content, so outbound links do not get to reach
  // back into the page that opened them.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", {
      rel: "noopener noreferrer nofollow",
    }),
  },
  // Stripping a disallowed src leaves the element behind, and an <iframe> or an
  // <img> with no src is an empty box on the page rather than nothing. Measured
  // on a synthetic foreign-host iframe: without this the output kept
  // `<iframe></iframe>`. A link keeps its text, because there the text is the
  // content; for these two the src IS the content.
  exclusiveFilter: (frame) =>
    (frame.tag === "iframe" || frame.tag === "img") && !frame.attribs.src,
}

/**
 * A text colour survives only if it stays readable on BOTH of our pages.
 *
 * This is the other half of dropping `background-color`, and it exists because
 * the first half creates the problem. Measured 2026-09-14 over the same 1494
 * products: 167 of them set a text colour, 216 times #ff0000 and 17 times
 * #000000. The black is not decoration -- on 17 livestock products it colours
 * the Hungarian-name cell, and it was readable ONLY because a #d9d9d9 band sat
 * behind it. Take the band away and leave the black, and those cells turn
 * invisible on the dark page: a fix that creates a worse defect than the one it
 * removes.
 *
 * So the rule is about the two ends of the scale, not about a list of colours.
 * A page of ours is either oklch(0.17) dark or oklch(0.99) light, so a near
 * black and a near white each disappear on one of them. Anything in between --
 * the 216 red legal warnings, a blue tip -- carries meaning and stays.
 *
 * The thresholds are HSL lightness, which keeps a saturated colour where it
 * belongs: #ff0000 is 0.5 and survives, while #000000 (0) and #ffffff (1) go.
 * A value we cannot parse (a named colour, an rgb() call -- zero occurrences
 * today) is left alone: a rule that cannot measure something should not act on
 * it.
 */
const SOTET_HATAR = 0.25
const VILAGOS_HATAR = 0.8

function hslLightness(value: string): number | null {
  const hex = value.trim().replace(/^#/, "")
  if (!/^[0-9a-f]+$/i.test(hex)) {
    return null
  }

  let r: number, g: number, b: number
  if (hex.length === 3 || hex.length === 4) {
    r = parseInt(hex[0] + hex[0], 16)
    g = parseInt(hex[1] + hex[1], 16)
    b = parseInt(hex[2] + hex[2], 16)
  } else if (hex.length === 6 || hex.length === 8) {
    r = parseInt(hex.slice(0, 2), 16)
    g = parseInt(hex.slice(2, 4), 16)
    b = parseInt(hex.slice(4, 6), 16)
  } else {
    return null
  }

  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  return (max + min) / 2
}

function dropUnreadableColors(html: string): string {
  return html.replace(/ style="([^"]*)"/gi, (whole, body: string) => {
    const kept = body
      .split(";")
      .filter((declaration) => {
        const [name, ...rest] = declaration.split(":")
        if (name.trim().toLowerCase() !== "color") {
          return true
        }
        const lightness = hslLightness(rest.join(":"))
        if (lightness === null) {
          return true
        }
        return lightness > SOTET_HATAR && lightness < VILAGOS_HATAR
      })
      .filter((declaration) => declaration.trim().length > 0)
      .join(";")

    return kept ? ` style="${kept}"` : ""
  })
}

/**
 * Returns the description as markup safe to insert, or null when there is
 * nothing to show.
 *
 * The null case matters: a description can be markup with no text in it (the
 * export holds records whose entire content is `<p></p> <p></p>`), and the page
 * should render nothing rather than an empty block.
 */
export function sanitizeDescription(
  description: string | null | undefined,
): string | null {
  if (!description) {
    return null
  }

  const clean = dropUnreadableColors(sanitizeHtml(description, OPTIONS)).trim()

  if (!clean) {
    return null
  }

  // Tags with no text and no media left behind are not worth a block on the page.
  const hasText =
    clean
      .replace(/<[^>]*>/g, "")
      .replace(/&nbsp;/g, " ")
      .trim().length > 0
  const hasMedia = /<(img|iframe|hr)\b/i.test(clean)

  return hasText || hasMedia ? clean : null
}
