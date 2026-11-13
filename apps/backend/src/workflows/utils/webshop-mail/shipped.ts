import { webshopMailState } from "../webshop-mail-config"
import type { MailToSend } from "./prepare"
import { type ShippedCarrier, type ShippedMailFacts, renderShippedMail } from "./shipped-mail"

/**
 * WHEN THE "FELADTUK" MAIL GOES (Foxpost brief point 12; endpoint agreed with
 * nautilus, 26342/26345). The OS calls the shipping-notice endpoint once the
 * parcel exists at the carrier, with the carrier's barcode. The answer says
 * what happened, so the OS can log it:
 *
 *   sent: true                       the mail went out
 *   sent: false, mail_off            the shop's mail channel is off (no key yet)
 *   sent: false, no_email            the order has no e-mail address
 *   sent: false, already_sent        this order and parcel number were mailed
 *   sent: false, stub_parcel         a STUB- number from the OS's stand-in
 *                                    carrier (its default mode): never a real
 *                                    parcel, so never in a customer's mail
 *
 * Idempotent on the order and the parcel number: a retried call sends
 * nothing more, a new number (a relabelled parcel) does.
 */
export type ShippingNotice = {
  carrier: ShippedCarrier
  tracking_number: string
  tracking_url?: string
  parcel_id?: string
}

export type ShippedOrder = {
  id: string
  display_id: number | string
  email: string | null
  total: number
  cash_on_delivery: boolean
  items: {
    title: string
    quantity: number
    fee: boolean
    /** The line's product and its handle (V3.3 S3): the usage guide's source and link. */
    product_id?: string | null
    product_handle?: string | null
  }[]
  method_name: string
  foxpost_point: { name: string; address: string } | null
  /** `type`: parcel-shop or parcel-locker, as stored (G1); null on an older order. */
  gls_point: { name: string; address: string; type?: string | null } | null
  shipping_address: string
}

export type ShippedDeps = {
  loadOrder(orderId: string): Promise<ShippedOrder | null>
  alreadySent(idempotencyKey: string): Promise<boolean>
  /**
   * What the usage guide is made of, per product id (V3.3): the approved `usage` copy block and the `dosing` fact the OS
   * projected, and the product's categories (for the fallback scope). OPTIONAL: without it, or when it fails, the mail goes
   * without guides.
   */
  usageGuides?(productIds: string[]): Promise<Map<string, ProductGuideSource>>
}

/** One product's usage guide sources (korall's spec, point 3). */
export type ProductGuideSource = {
  /** The approved `usage` copy block's text, or null. */
  usage: string | null
  /** The VERIFIED, public `dosing` fact's value, in the OS canonical form ("5 ml/100 L/day"), or null. */
  dosing: string | null
  /** The product's categories, each as its chain of names from the root. */
  categories: string[][]
}

/**
 * At most this many guides (the OS draws eight and a "rest" line, `WEBSHOP_USAGE_GUIDE_LIMITS`), each excerpt at most this
 * long (korall's spec: about 300 characters, on a sentence boundary; the OS accepts up to 400).
 */
export const USAGE_GUIDE_LIMITS = { count: 10, excerpt: 300 } as const

/**
 * THE FALLBACK SCOPE (korall's spec, points 4 and 8): a product in one of these categories, or under one, gets the fallback
 * sentence even with neither an approved guide nor a dose (case D): the water treatments, additives and chemicals the
 * Product Knowledge covers. Equipment, accessories and livestock do not. ONE LIST, by the category names of the test shop's
 * tree (measured 2026-11-13, 219 categories); acrobot or Balázs may change it here, nowhere else.
 */
export const USAGE_FALLBACK_CATEGORIES: readonly string[] = [
  "Vízkezelés",
  "Nyomelemek",
  "Problémamegoldás",
  "Indítóbaktériumok",
  "Koralltápok",
  "Tengeri só",
]

export const inFallbackScope = (categories: readonly (readonly string[])[]): boolean =>
  categories.some((chain) => chain.some((name) => USAGE_FALLBACK_CATEGORIES.includes(name.trim())))

/** The chain of names from the root to each category; a broken or looping parent link ends the chain. */
export const categoryChains = (
  ids: readonly string[],
  tree: ReadonlyMap<string, { name: string; parentId: string | null }>
): string[][] =>
  ids.flatMap((id) => {
    const chain: string[] = []
    const seen = new Set<string>()
    for (let at: string | null = id; at && !seen.has(at); ) {
      seen.add(at)
      const node = tree.get(at)
      if (!node) break
      chain.unshift(node.name)
      at = node.parentId
    }
    return chain.length > 0 ? [chain] : []
  })

/** The label that opens the "what it is for" part of a usage text (korall's template, point 2): "Mire való:". */
const PURPOSE_LABEL = /^\s*mire\s+való\s*[:.]\s*/iu
/** A line that opens the next part: a short label with a colon ("Adagolás (a gyártó szerint):", "Hogyan:"). */
const NEXT_LABEL = /^\s*\p{Lu}[^\n:.!?]{0,40}:/u
/** A text still waiting for a fact or a source: it is never sent (spec point 5). */
const PLACEHOLDER = "[KITÖLTENDŐ"

/**
 * THE EXCERPT (korall's spec, point 3): the text of the "Mire való" part, up to the next label or the paragraph's end; without
 * the label, the first paragraph. One line, at most the limit, cut after a whole sentence; a first sentence longer than the
 * limit is cut on a word. A text with a placeholder gives no excerpt.
 */
export const usageExcerpt = (body: string): string => {
  if (body.includes(PLACEHOLDER)) return ""
  const lines = body.replace(/\r\n?/g, "\n").split("\n")
  const start = lines.findIndex((line) => PURPOSE_LABEL.test(line))
  let part: string
  if (start >= 0) {
    const taken = [lines[start].replace(PURPOSE_LABEL, "")]
    for (const line of lines.slice(start + 1)) {
      if (!line.trim() || NEXT_LABEL.test(line)) break
      taken.push(line)
    }
    part = taken.join(" ")
  } else {
    part = body.replace(/\r\n?/g, "\n").split(/\n{2,}/).map((p) => p.trim()).find(Boolean) ?? ""
  }
  const line = part.replace(/\s+/g, " ").trim()
  const max = USAGE_GUIDE_LIMITS.excerpt
  if (line.length <= max) return line
  let cut = ""
  for (const sentence of line.split(/(?<=[.!?…])\s+/)) {
    const next = cut ? `${cut} ${sentence}` : sentence
    if (next.length > max) break
    cut = next
  }
  return cut || `${line.slice(0, max).replace(/\s+\S*$/, "")}…`
}

/** The product page on the storefront (Hungarian, `/hu/termek/<handle>`), https only; null without a base or a handle. */
export const productPageUrl = (env: NodeJS.ProcessEnv, handle: string | null | undefined): string | null =>
  handle ? storefrontImageUrl(env, `/hu/termek/${encodeURIComponent(handle)}`) : null

/**
 * THE PARCEL'S USAGE GUIDES (V3.3, korall's spec point 4): the non-fee lines' products, each once, in the parcel's order,
 * with the excerpt (case A/B), the dose (A/C), or only the fallback scope (D); a product with none of them is left out.
 * When no product has an excerpt or a dose, no guide at all (the fallback sentence alone does not make a section). A failed
 * lookup is no guide, never a failed mail.
 */
export const shippedUsageGuides = async (
  order: ShippedOrder,
  deps: ShippedDeps,
  env: NodeJS.ProcessEnv
): Promise<NonNullable<ShippedMailFacts["usage_guides"]>> => {
  const lines = order.items.filter((item) => !item.fee && item.product_id)
  const ids = [...new Set(lines.map((item) => item.product_id!))]
  if (!deps.usageGuides || ids.length === 0) return []
  let sources: Map<string, ProductGuideSource>
  try {
    sources = await deps.usageGuides(ids)
  } catch {
    return []
  }
  const seen = new Set<string>()
  const guides: NonNullable<ShippedMailFacts["usage_guides"]> = []
  for (const item of lines) {
    const id = item.product_id!
    const source = sources.get(id)
    if (!source || seen.has(id) || guides.length >= USAGE_GUIDE_LIMITS.count) continue
    seen.add(id)
    const excerpt = source.usage ? usageExcerpt(source.usage) : ""
    const dosing = source.dosing?.trim() ? [source.dosing.trim()] : []
    const fallbackScope = inFallbackScope(source.categories)
    if (!excerpt && dosing.length === 0 && !fallbackScope) continue
    guides.push({
      title: item.title,
      excerpt,
      ...(dosing.length > 0 ? { dosing } : {}),
      ...(fallbackScope ? { fallback_scope: true } : {}),
      url: productPageUrl(env, item.product_handle),
    })
  }
  return guides.some((g) => g.excerpt || g.dosing) ? guides : []
}

export type ShippedResult =
  | { status: "not_found" }
  | { status: "skip"; reason: "mail_off" | "no_email" | "already_sent" | "stub_parcel" }
  | { status: "send"; mail: MailToSend }

/**
 * The OS's stand-in carrier numbers its parcels `STUB-…` (acropora-os
 * `stub-carrier.client.ts`, `STUB_PARCEL_PREFIX`), so a stage run never looks
 * real (nautilus 26359: such a number must never reach the "Feladtuk" mail).
 */
export const STUB_PARCEL_PREFIX = "STUB-"

export const isStubParcelNumber = (trackingNumber: string) =>
  trackingNumber.trim().toUpperCase().startsWith(STUB_PARCEL_PREFIX)

export const shippedKey = (orderId: string, trackingNumber: string) =>
  `order-shipped:${orderId}:${trackingNumber}`

/** An image on the storefront, for the mail's <img>; https only. */
const storefrontImageUrl = (env: NodeJS.ProcessEnv, path: string): string | null => {
  const base = env.ACROPORA_WEBSHOP_URL?.trim()
  if (!base) return null
  try {
    const url = new URL(path, base)
    return url.protocol === "https:" ? url.toString() : null
  } catch {
    return null
  }
}

/** The official logo on the storefront, for the mail's <img>; https only. */
export const foxpostLogoUrl = (env: NodeJS.ProcessEnv): string | null =>
  storefrontImageUrl(env, "/images/foxpost-packeta-group.png")

/**
 * THE GLS LOGO OF THE MAIL (the GLS prompt, point 12; Figma 508:594, 508:613):
 * the point's own kind (GLS Automata, or GLS Csomagpont for a ParcelShop), the
 * general GLS logo for home delivery. The same files the checkout shows.
 */
export const glsLogoUrl = (
  env: NodeJS.ProcessEnv,
  point: { type?: string | null } | null
): string | null =>
  storefrontImageUrl(
    env,
    !point
      ? "/images/gls.png"
      : point.type === "parcel-locker"
        ? "/images/gls-automata.png"
        : "/images/gls-csomagpont.png"
  )

export const prepareShippedMail = async (
  orderId: string,
  notice: ShippingNotice,
  deps: ShippedDeps,
  env: NodeJS.ProcessEnv = process.env
): Promise<ShippedResult> => {
  const order = await deps.loadOrder(orderId)
  if (!order) return { status: "not_found" }
  // before the switch: the answer names the stub even while the channel is off
  if (isStubParcelNumber(notice.tracking_number)) return { status: "skip", reason: "stub_parcel" }
  if (webshopMailState(env) !== "on") return { status: "skip", reason: "mail_off" }
  const to = order.email?.trim()
  if (!to) return { status: "skip", reason: "no_email" }
  const key = shippedKey(order.id, notice.tracking_number)
  if (await deps.alreadySent(key)) return { status: "skip", reason: "already_sent" }

  const point = notice.carrier === "foxpost" ? order.foxpost_point : order.gls_point
  const shipped = {
    display_id: order.display_id,
    carrier: notice.carrier,
    destination_title: point?.name ?? order.method_name,
    destination_address: point?.address ?? order.shipping_address,
    gls_point: notice.carrier === "gls" && !!order.gls_point,
    tracking_number: notice.tracking_number,
    tracking_url: notice.tracking_url ?? null,
    items: order.items.filter((item) => !item.fee).map(({ title, quantity }) => ({ title, quantity })),
    cod_amount: order.cash_on_delivery ? order.total : null,
    foxpost_logo_url: foxpostLogoUrl(env),
    gls_logo_url: notice.carrier === "gls" ? glsLogoUrl(env, order.gls_point) : null,
    gls_point_type: notice.carrier === "gls" ? (order.gls_point?.type ?? null) : null,
  }
  const guides = await shippedUsageGuides(order, deps, env)
  if (guides.length > 0) Object.assign(shipped, { usage_guides: guides })
  return {
    status: "send",
    mail: {
      to,
      template: "order-shipped",
      idempotency_key: key,
      resource_id: order.id,
      content: renderShippedMail(shipped),
      render: { template: "order-shipped", facts: { shipped } },
    },
  }
}
