import { z } from "@medusajs/framework/zod"

/**
 * A link target on the shop itself: one path, no scheme, and not `//host`
 * (a protocol-relative address leaves the shop).
 */
const shopPath = z
  .string()
  .max(300)
  .regex(/^\/[^\s]*$/, "A shop path starts with one slash")
  .refine((v) => !v.startsWith("//"), "A protocol-relative address leaves the shop")

/** An image address: http(s) or a shop path. Never `javascript:` or `data:`. */
const imageAddress = z
  .string()
  .max(1000)
  .refine(
    (v) => /^https?:\/\/[^\s]+$/.test(v) || (/^\/[^\s]*$/.test(v) && !v.startsWith("//")),
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
    slides: z.array(slide).max(5),
  })
  .strict()

export type AdminPutHomepageContentType = z.infer<typeof AdminPutHomepageContent>
