import { z } from "@medusajs/framework/zod"

/**
 * One slash, then neither `/` nor `\`, and no backslash anywhere: a browser
 * reads `\` as `/` in an http(s) address, so `/\evil.example` would be
 * `//evil.example`, a protocol-relative address that leaves the shop
 * (barracuda, #551). No whitespace either: the URL parser strips tabs and
 * newlines, which could hide a second slash.
 */
const SHOP_PATH = /^\/(?![/\\])[^\s\\]*$/

/**
 * A link target on the shop itself: one path, no scheme, and not `//host`
 * (a protocol-relative address leaves the shop).
 */
const shopPath = z
  .string()
  .max(300)
  .regex(SHOP_PATH, "A shop path starts with one slash")

/** An image address: http(s) or a shop path. Never `javascript:` or `data:`. */
const imageAddress = z
  .string()
  .max(1000)
  .refine(
    (v) => /^https?:\/\/[^\s]+$/.test(v) || SHOP_PATH.test(v),
    "An image address is http(s) or a shop path"
  )

const slide = z
  .object({
    eyebrow: z.string().max(200),
    title: z.string().max(300),
    text: z.string().max(1000),
    cta: z.string().max(100),
    cta_href: shopPath.nullable(),
    cta2: z.string().max(100),
    cta2_href: shopPath.nullable(),
    caption: z.string().max(300),
    caption2: z.string().max(300),
    image_url: imageAddress.nullable(),
    image_alt: z.string().max(300),
  })
  .strict()

/** The eight fixed home page blocks, by the key the storefront and the OS share. */
export const HOMEPAGE_BLOCK_KEYS = [
  "hero",
  "mit-keresel",
  "kezdo-es-halado",
  "egyedi-korallok",
  "szolgaltatasok",
  "markak",
  "velemenyek",
  "boltunk",
] as const

/**
 * The home page's blocks in display order, each shown or hidden. A list holds
 * ALL eight fixed blocks exactly once: a missing block would be a hole whose
 * meaning (hidden? forgotten?) nobody can read, and a repeated one would be
 * drawn twice. `null` (or absent) is "not set": the storefront shows its own
 * order with everything visible. Free-form blocks are not part of this contract
 * (Balázs has not asked for them, acrobot 2026-10-26).
 */
const blocks = z
  .array(
    z
      .object({
        key: z.enum(HOMEPAGE_BLOCK_KEYS),
        visible: z.boolean(),
      })
      .strict()
  )
  .length(HOMEPAGE_BLOCK_KEYS.length)
  .refine(
    (list) => new Set(list.map((b) => b.key)).size === HOMEPAGE_BLOCK_KEYS.length,
    "Each fixed block is listed exactly once"
  )

/** A footer link target: a path on the shop, or an http(s) address. Never `javascript:`. */
const linkTarget = z
  .string()
  .max(500)
  .refine(
    (v) => /^https?:\/\/[^\s]+$/.test(v) || SHOP_PATH.test(v),
    "A link is a shop path or an http(s) address"
  )

const socialAddress = z
  .string()
  .max(500)
  .regex(/^https?:\/\/[^\s]+$/, "A social address is http(s)")
  .nullable()

/**
 * The footer as the OS edits it. `intro` is HTML the OS already cleaned with
 * its shared profile; the storefront cleans it again and does not take it as
 * given. The shop's contact details are NOT here: they come from the "A
 * boltunk" block texts, so there is one address on the page, not two. The
 * legal documents (ASZF, privacy) are not editable: the storefront always adds
 * them from its own list.
 */
const footer = z
  .object({
    // The OS measures 4000 characters BEFORE it cleans the HTML; this checks the
    // cleaned value it sends. Cleaning can lengthen a text (escaping, rewritten
    // attributes), so the shop's cap is looser than the OS's: the OS stays the
    // strict side and a text it accepted is never refused here (barracuda, #564).
    intro: z.string().max(8000),
    columns: z
      .array(
        z
          .object({
            // An empty column title is accepted here. The OS (#1878) now forbids
            // it, so the OS is the stricter side and the shop the more tolerant
            // one: compatible in both directions, and a record with an empty
            // title (an older OS build, or a hand-made one) does not take the
            // WHOLE record (texts and slides too) down. The storefront drops a
            // column that has neither a title nor a link.
            title: z.string().max(100),
            links: z
              .array(
                z
                  .object({
                    label: z.string().min(1).max(100),
                    href: linkTarget,
                  })
                  .strict()
              )
              .max(12),
          })
          .strict()
      )
      .max(4),
    social: z
      .object({
        facebook: socialAddress,
        instagram: socialAddress,
        youtube: socialAddress,
      })
      .strict(),
    bottom_text: z.string().max(300),
  })
  .strict()

/**
 * The footer's newsletter row (kirakat-lablec-kep, 2026-10-27): on or off, and
 * its texts. The consent text is what a sign-up records as given, so it cannot
 * be empty; the storefront puts the privacy notice's link next to it.
 */
const newsletter = z
  .object({
    enabled: z.boolean(),
    title: z.string().max(100),
    text: z.string().max(500),
    consent_text: z.string().trim().min(1).max(500),
    button: z.string().trim().min(1).max(40),
  })
  .strict()

/**
 * The whole home page content, as the Acropora OS sends it. Every key is
 * required, so an OS that forgets one is refused rather than leaving an old
 * value in place. An empty string is how a text is cleared: the storefront
 * shows nothing for it (it does not fall back to the starting value, which is
 * only for a key that was never sent).
 */
export const AdminPutHomepageContent = z
  .object({
    texts: z
      .record(
        z.string().regex(/^[a-z0-9][a-z0-9_.-]{0,79}$/, "A text key is lowercase, dots and underscores"),
        z.string().max(2000)
      )
      .refine((t) => Object.keys(t).length <= 400, "At most 400 texts"),
    // Balázs, 2026-10-20: the hero carousel holds at most five slides.
    // `null` is "not set": the storefront shows its own starting slides, so
    // an OS that edited only texts does not blank the hero. An empty array is
    // a decision (no hero), and is NOT the same as null.
    slides: z.array(slide).max(5).nullable(),
    // The product handles of the "Egyedi korallok" band, in order. Optional:
    // an OS that predates the field keeps working (absent is the same as none).
    featured_handles: z
      .array(
        z
          .string()
          .min(1)
          .max(200)
          // a product handle: lowercase, digits, dot, underscore, hyphen; no
          // `..` (a path segment), no `%` (an encoded slash), no markup
          .regex(/^[a-z0-9][a-z0-9._-]*$/, "A handle is a plain product handle")
          .refine((h) => !h.includes(".."), "A handle has no ..")
      )
      .max(12)
      // each product once: the band would show the same coral twice
      .refine(
        (list) => new Set(list).size === list.length,
        "A handle is listed once"
      )
      .nullable()
      // absent keeps the stored list, null or [] empties it
      .optional(),
    // The brand handles of the logo strip, in order (Balázs, 2026-10-27: any
    // number of brands). The cap is a sanity bound, not a design limit: the
    // OS has about 200 brands. Optional like `featured_handles`.
    featured_brand_handles: z
      .array(
        z
          .string()
          .min(1)
          .max(200)
          // the brand page's handle (`/hu/marka/{handle}`), the same plain
          // shape as a product handle
          .regex(/^[a-z0-9][a-z0-9._-]*$/, "A handle is a plain brand handle")
          .refine((h) => !h.includes(".."), "A handle has no ..")
      )
      .max(500)
      // each brand once: the strip would show the same logo twice
      .refine(
        (list) => new Set(list).size === list.length,
        "A handle is listed once"
      )
      .nullable()
      // absent keeps the stored list, null or [] empties it
      .optional(),
    // Optional like `featured_handles`: an OS that predates the fields keeps
    // working. Absent keeps what is stored, `null` clears it ("not set": the
    // storefront shows its own order and its own footer).
    blocks: blocks.nullable().optional(),
    footer: footer.nullable().optional(),
    // absent keeps, null clears ("not set": the storefront's own row)
    newsletter: newsletter.nullable().optional(),
  })
  .strict()

export type AdminPutHomepageContentType = z.infer<typeof AdminPutHomepageContent>
