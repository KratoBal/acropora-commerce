/**
 * THE NEXT LIVE ANIMAL ARRIVAL OF A PRODUCT, AS THE OS WRITES IT (V2.6 S3b, card f4e4832b). The OS projects a versioned JSON
 * text onto the product's metadata key `livestock_arrival` while the product has an arrival a customer may register for that
 * has not arrived: `{"v":1,"expected_on":"2026-11-13","status":"ordered"|"in_transit"}` (OS `medusa-livestock-arrival.ts`,
 * the pair of this file: two repos, no shared package, so if the strings differ the page silently shows nothing).
 *
 * READ STRICTLY, and the product page then shows nothing for anything else: an unknown version (a new shape is a new version,
 * not a guess), a day that is not a real calendar day, a stage this page has no words for, extra text. A line that is wrong is
 * worse than none: it tells a customer when a living animal will be here.
 *
 * THE DAY IS NOT JUDGED HERE AGAINST THE CLOCK BY THE OS, SO THIS FILE DOES: a day already past (the arrival slips, and the
 * staff edit that moves it has not come yet) is worded as late, never as a date in the past.
 */
export const LIVESTOCK_ARRIVAL_KEY = "livestock_arrival"
export const LIVESTOCK_ARRIVAL_VERSION = 1

export type LivestockArrivalStage = "ordered" | "in_transit"

export type LivestockArrival = {
  /** the expected day, `YYYY-MM-DD` */
  expectedOn: string
  stage: LivestockArrivalStage
}

const STAGES: readonly LivestockArrivalStage[] = ["ordered", "in_transit"]
const DAY = /^(\d{4})-(\d{2})-(\d{2})$/

/** A real calendar day (2026-02-31 is not one), as `YYYY-MM-DD`. */
const isDay = (value: unknown): value is string => {
  if (typeof value !== "string") return false
  const m = DAY.exec(value)
  if (!m) return false
  const at = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
  return at.toISOString().slice(0, 10) === value
}

/** The product's arrival from its metadata, or null when there is none or the text is not exactly the contract. */
export function livestockArrivalOf(
  metadata: Record<string, unknown> | null | undefined,
): LivestockArrival | null {
  const raw = metadata?.[LIVESTOCK_ARRIVAL_KEY]
  if (typeof raw !== "string" || raw === "") return null
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
    return null
  const o = parsed as Record<string, unknown>
  if (o.v !== LIVESTOCK_ARRIVAL_VERSION) return null
  if (!isDay(o.expected_on)) return null
  if (!STAGES.includes(o.status as LivestockArrivalStage)) return null
  // no other key: a shape this reader does not know is not read halfway
  if (Object.keys(o).some((k) => !["v", "expected_on", "status"].includes(k)))
    return null
  return { expectedOn: o.expected_on, stage: o.status as LivestockArrivalStage }
}

/** Today's date in the shop's own day (Budapest), as `YYYY-MM-DD`. */
export const shopDay = (now: Date = new Date()): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Budapest",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)

/** The day as the page says it: "2026. november 13." / "13 November 2026". */
export const arrivalDayText = (
  expectedOn: string,
  language: "hu" | "en",
): string =>
  new Intl.DateTimeFormat(language === "hu" ? "hu-HU" : "en-GB", {
    timeZone: "UTC",
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(`${expectedOn}T00:00:00.000Z`))

/** Late: the expected day is before the shop's today. The day itself is still "expected". */
export const arrivalIsLate = (
  arrival: LivestockArrival,
  today: string = shopDay(),
): boolean => arrival.expectedOn < today

/**
 * Whether the page shows the arrival at all: not when the product is buyable from STOCK (an arrival of more of the same would only
 * confuse the buy box). A product buyable ONLY on backorder (managed stock, zero pieces, backorder allowed: `backorderOnly`) shows it:
 * that is the customer who most needs the day, since the order waits for the animal (test shop, 2026-11-10: the OS gives every
 * ordinary product backorder, so a zero-stock fish is "Rendelhető" and the line never stood on the products it was made for).
 */
export const arrivalShown = (
  arrival: LivestockArrival | null,
  pageState: string,
  backorderOnly: boolean = false,
): arrival is LivestockArrival =>
  arrival !== null && (pageState !== "KAPHATO" || backorderOnly)

/** The line is worded as "orderable": the page is buyable (on backorder) while the arrival is shown. */
export const arrivalOrderable = (pageState: string): boolean =>
  pageState === "KAPHATO"
