import type { Logger, MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, MedusaError, getVariantAvailability } from "@medusajs/framework/utils"

import { STOCK_ALERT_MODULE } from "../../modules/stock-alert"
import {
  type ArrivalCandidate,
  type ArrivalRow,
  arrivalStep,
  knownAvailableChanged,
} from "../../modules/stock-alert/arrival"
import type StockAlertModuleService from "../../modules/stock-alert/service"
import { speciesOfTitle } from "../../modules/stock-alert/subject"
import {
  type StockAlertArrivalResult,
  notifyStockAlertArrival,
} from "./webshop-mail/stock-alert-arrival-mail"

/**
 * THE STOCK ALERT'S ARRIVAL SWEEP ("Szólj, ha jön hasonló", V2.4, card 0c1265d2; the job `stock-alert-arrivals`).
 * Every confirmed row not yet told is matched against what of its subject can be bought now, by the rule in
 * `modules/stock-alert/arrival.ts`; a row with an arrival gets its one mail and is marked told, every other row keeps
 * its seen set. A sweep, not an event: the projection writes stock in batches and through several paths, and the
 * sweep finds an arrival however it came, a few minutes late at most.
 *
 * WHAT "CAN BE BOUGHT" MEANS is the storefront's own rule (`valtozatKaphato`): a published product of the shop's
 * sales channel with a variant that is not stock-managed, may be backordered, or has stock in the channel's locations.
 *
 * A row whose mail could not be handed over (`failed`) stays waiting and is tried on the next sweep; the mail's key
 * keeps a retried one single. A subject whose products could not be read is skipped this time, with a log line, and
 * the other subjects go on.
 */
export type WaitingRow = ArrivalRow & {
  id: string
  email: string
  subject_key: string
  subject_label: string
  consent_language: string
  unsubscribe_token: string | null
  confirmed_at: Date | string | null
}

export type ArrivalOperations = {
  /** confirmed rows not yet told */
  waiting(): Promise<WaitingRow[]>
  /** every product of the subject buyable now */
  buyable(kind: string, key: string): Promise<ArrivalCandidate[]>
  save(id: string, changes: Record<string, unknown>): Promise<void>
  notify(row: WaitingRow, product: ArrivalCandidate): Promise<StockAlertArrivalResult>
  warn(message: string): void
  now(): Date
}

export type ArrivalSweep = { rows: number; told: number; failed: number }

export async function runStockAlertArrivals(ops: ArrivalOperations): Promise<ArrivalSweep> {
  const rows = await ops.waiting()
  const subjects = new Map<string, Promise<ArrivalCandidate[] | null>>()
  const result: ArrivalSweep = { rows: rows.length, told: 0, failed: 0 }
  for (const row of rows) {
    // a confirmed row always has both; one without them cannot be mailed (no leaving link) and is not touched
    if (!row.unsubscribe_token || !row.confirmed_at) continue
    const subjectKey = `${row.subject_kind}\u0000${row.subject_key}`
    if (!subjects.has(subjectKey))
      subjects.set(
        subjectKey,
        ops.buyable(row.subject_kind, row.subject_key).catch((error) => {
          ops.warn(
            `stock alert arrivals: the ${row.subject_kind} ${row.subject_key} could not be read (${(error as Error)?.name ?? "error"})`
          )
          return null
        })
      )
    const buyable = await subjects.get(subjectKey)!
    if (!buyable) continue
    const step = arrivalStep(row, buyable)
    if (step.arrived) {
      const sent = await ops.notify(row, step.arrived)
      if (sent.sent || sent.reason === "queued") {
        await ops.save(row.id, {
          known_available: step.known_available,
          notified_at: ops.now(),
          notified_product_id: step.arrived.id,
        })
        result.told++
        continue
      }
      result.failed++
    }
    if (knownAvailableChanged(row.known_available, step.known_available))
      await ops.save(row.id, { known_available: step.known_available })
  }
  return result
}

type Query = Parameters<typeof getVariantAvailability>[0]

type ProductRow = {
  id: string
  title: string | null
  handle: string
  created_at: Date | string
  sales_channels?: ({ id: string } | null)[] | null
  variants?: ({ id: string; manage_inventory: boolean | null; allow_backorder: boolean | null } | null)[] | null
}

const PAGE = 200

/**
 * The subject's buyable products. A species is found by its two words in the title (`$ilike`, loose, so a leading
 * space or a double one does not hide a piece), then the exact rule of `speciesOfTitle` ("Acropora tenuisx" is not
 * "Acropora tenuis", and the binomial must head the title); a product by its id. The key is the lowercased binomial,
 * letters and hyphens only, so it carries no `%` or `_` into the pattern.
 */
export async function buyableProducts(
  query: Query,
  kind: string,
  key: string,
  availability: (variantIds: string[], salesChannelId: string) => Promise<Record<string, number>> = async (
    variantIds,
    salesChannelId
  ) => {
    const result = await getVariantAvailability(query, { variant_ids: variantIds, sales_channel_id: salesChannelId })
    return Object.fromEntries(Object.entries(result).map(([id, row]) => [id, Number(row.availability) || 0]))
  }
): Promise<ArrivalCandidate[]> {
  const { data: stores } = await query.graph({ entity: "store", fields: ["default_sales_channel_id"] })
  const salesChannelId = (stores[0] as { default_sales_channel_id?: string | null } | undefined)?.default_sales_channel_id
  if (!salesChannelId) throw new MedusaError(MedusaError.Types.UNEXPECTED_STATE, "The store has no default sales channel")

  const filters =
    kind === "species"
      ? { status: "published", title: { $ilike: `%${key.split(" ").join("%")}%` } }
      : kind === "product"
        ? { status: "published", id: key }
        : null
  if (!filters) return []
  const products: ProductRow[] = []
  for (let skip = 0; ; skip += PAGE) {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "title",
        "handle",
        "created_at",
        "sales_channels.id",
        "variants.id",
        "variants.manage_inventory",
        "variants.allow_backorder",
      ],
      filters: filters as never,
      pagination: { skip, take: PAGE, order: { created_at: "ASC", id: "ASC" } },
    })
    for (const product of data as ProductRow[])
      if (
        product.sales_channels?.some((c) => c?.id === salesChannelId) &&
        (kind !== "species" || speciesOfTitle(product.title)?.key === key)
      )
        products.push(product)
    if (data.length < PAGE) break
  }

  const counted = products.flatMap((p) =>
    (p.variants ?? []).filter((v) => v && v.manage_inventory && !v.allow_backorder).map((v) => v!.id)
  )
  const stock = counted.length ? await availability(counted, salesChannelId) : {}
  return products
    .filter((p) =>
      (p.variants ?? []).some((v) => v && (!v.manage_inventory || v.allow_backorder || (stock[v.id] ?? 0) > 0))
    )
    .map((p) => ({ id: p.id, title: p.title?.trim() || p.handle, handle: p.handle, created_at: p.created_at }))
}

/** The default operations, from the job's container. */
export function stockAlertArrivalOperations(container: MedusaContainer): ArrivalOperations {
  const service = container.resolve<StockAlertModuleService>(STOCK_ALERT_MODULE)
  const query = container.resolve(ContainerRegistrationKeys.QUERY) as Query
  const logger = container.resolve<Logger>(ContainerRegistrationKeys.LOGGER)
  return {
    waiting: async () =>
      (await service.listStockAlertSubscriptions(
        { status: "confirmed", notified_at: null },
        { take: null }
      )) as unknown as WaitingRow[],
    buyable: (kind, key) => buyableProducts(query, kind, key),
    save: async (id, changes) => {
      await service.updateStockAlertSubscriptions([{ id, ...changes }])
    },
    notify: (row, product) =>
      notifyStockAlertArrival(container, {
        id: row.id,
        to: row.email,
        subject_label: row.subject_label,
        language: row.consent_language,
        unsubscribe_token: row.unsubscribe_token!,
        confirmed_at: row.confirmed_at!,
        product: { title: product.title, handle: product.handle },
      }),
    warn: (message) => logger.warn(message),
    now: () => new Date(),
  }
}
