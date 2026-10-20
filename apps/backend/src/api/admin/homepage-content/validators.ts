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
          .regex(/^[^\s/?#\\]+$/, "A handle is one URL segment")
      )
      .max(12)
      .nullable()
      .optional(),
  })
  .strict()

export type AdminPutHomepageContentType = z.infer<typeof AdminPutHomepageContent>
