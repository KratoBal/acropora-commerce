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
 * The 11 CSS properties that actually occur in the export's style attributes.
 *
 * The style attribute is kept because 189 products carry their technical
 * specifications in tables (5362 td and 2655 tr style attributes); without it
 * those tables collapse into one run of text. But "keep style" and "keep any
 * style" are different promises: none of the properties below can position an
 * element over the page or load a URL, and anything not listed is dropped.
 */
const ALLOWED_STYLES = {
  "*": {
    width: [/^\d+(\.\d+)?(px|%|em|rem)$/],
    height: [/^\d+(\.\d+)?(px|%|em|rem)$/],
    "background-color": [/^#[0-9a-f]{3,8}$/i, /^rgba?\([\d\s.,%]+\)$/i, /^[a-z]+$/i],
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
    "p", "br", "strong", "b", "em", "i", "u", "span", "sup", "sub", "pre",
    // headings -- h1 through h5 all occur
    "h1", "h2", "h3", "h4", "h5",
    // lists
    "ul", "ol", "li",
    // tables: the single most important group, 189 products depend on them
    "table", "thead", "tbody", "tfoot", "tr", "th", "td",
    // structure
    "div", "section", "article", "blockquote", "figure", "figcaption", "hr",
    // links, images and embedded video, each narrowed below
    "a", "img", "iframe",
  ],
  // <meta> is dropped deliberately. It occurs 1563 times across 431 description
  // fields (400 products) as a leftover <meta charset> at the start of the text,
  // and it means nothing inside a product description. The source-side pollution
  // itself is a migration question and is tracked separately.
  allowedAttributes: {
    "*": ["style", "class"],
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    iframe: ["src", "width", "height", "title", "allow", "allowfullscreen", "frameborder"],
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
  allowedIframeHostnames: ["www.youtube.com", "youtube.com", "www.youtube-nocookie.com"],
  // A description is not trusted content, so outbound links do not get to reach
  // back into the page that opened them.
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer nofollow" }),
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
 * Returns the description as markup safe to insert, or null when there is
 * nothing to show.
 *
 * The null case matters: a description can be markup with no text in it (the
 * export holds records whose entire content is `<p></p> <p></p>`), and the page
 * should render nothing rather than an empty block.
 */
export function sanitizeDescription(
  description: string | null | undefined
): string | null {
  if (!description) {
    return null
  }

  const clean = sanitizeHtml(description, OPTIONS).trim()

  if (!clean) {
    return null
  }

  // Tags with no text and no media left behind are not worth a block on the page.
  const hasText = clean.replace(/<[^>]*>/g, "").replace(/&nbsp;/g, " ").trim().length > 0
  const hasMedia = /<(img|iframe|hr)\b/i.test(clean)

  return hasText || hasMedia ? clean : null
}
