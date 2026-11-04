import { createHash, randomBytes } from "node:crypto"

import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { ORDER_PROBLEM_REPORT_MODULE } from "../../../modules/order-problem-report"
import type OrderProblemReportModuleService from "../../../modules/order-problem-report/service"
import type { ProblemKind } from "../../../modules/order-problem-report/types"
import { emailKey } from "../guest-order/lookup"
import { MAX_PHOTOS, type PhotoType } from "./rules"

/**
 * THE PROBLEM REPORT'S FLOW (V1.2), the Medusa side. The rule that matters: a customer reaches an order's
 * report only with the same pair the guest lookup takes (the order number and the address it was ordered with),
 * and every miss is ONE answer (`null`): no such order, a wrong address, an order of another customer.
 */
export type AccessibleOrder = { id: string; itemIds: string[] }

/** The order the pair opens, with its line item ids, or null. The address is compared trimmed and lower case. */
export const accessibleOrder = async (
  container: MedusaContainer,
  displayId: number,
  email: string,
): Promise<AccessibleOrder | null> => {
  if (!Number.isSafeInteger(displayId) || displayId <= 0 || emailKey(email) === "") return null
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const { data } = await query.graph({
    entity: "order",
    filters: { display_id: displayId } as Record<string, unknown>,
    fields: ["id", "email", "items.id"],
  })
  const order = (data?.[0] ?? null) as { id: string; email?: string | null; items?: ({ id: string } | null)[] } | null
  if (!order || emailKey(order.email) !== emailKey(email)) return null
  return { id: order.id, itemIds: (order.items ?? []).filter(Boolean).map((item) => item!.id) }
}

const service = (container: MedusaContainer) =>
  container.resolve<OrderProblemReportModuleService>(ORDER_PROBLEM_REPORT_MODULE)

/** An unguessable folder per order inside the file module: nobody can derive another order's folder from its id. */
export const photoFolderOf = (orderId: string): string =>
  `problem-reports/${createHash("sha256").update(orderId).digest("hex").slice(0, 16)}`

export type StoredPhoto = { id: string; url: string }

/** Stores one decoded photo in the shop's file module and records it for the order (not yet in a report). */
export const storePhoto = async (
  container: MedusaContainer,
  orderId: string,
  bytes: Buffer,
  type: PhotoType,
): Promise<StoredPhoto> => {
  const file = container.resolve(Modules.FILE) as unknown as {
    createFiles(data: { filename: string; mimeType: string; content: string; access: "private" | "public" }): Promise<{
      id: string
      url: string
    }>
  }
  // the name is chosen here, never taken from the browser: 16 random bytes, the type from the bytes
  const created = await file.createFiles({
    filename: `${photoFolderOf(orderId)}/${randomBytes(16).toString("hex")}.${type.ext}`,
    mimeType: type.mime,
    content: bytes.toString("base64"),
    access: "private",
  })
  const row = await service(container).createOrderProblemImages({
    order_id: orderId,
    report_id: null,
    file_key: created.id,
    url: created.url,
    mime_type: type.mime,
    size_bytes: bytes.length,
  })
  return { id: row.id, url: created.url }
}

/** How many of the order's uploads no report has taken yet (the route caps it: an abandoned form leaves files). */
export const unattachedPhotoCount = async (container: MedusaContainer, orderId: string): Promise<number> =>
  (await service(container).listOrderProblemImages({ order_id: orderId, report_id: null })).length

/**
 * Stores a photo and keeps the order's cap even when uploads race. The route checks the count first (a cheap early
 * answer), but two uploads at the cap's edge both see room. So after storing, the photo finds its place among the
 * order's unsent uploads in one fixed order (oldest first, id as the tie-break): the first `cap` stay, any beyond
 * remove themselves and the caller answers "too many". Two racing requests therefore never leave more than `cap`.
 */
export const storePhotoWithinCap = async (
  container: MedusaContainer,
  orderId: string,
  bytes: Buffer,
  type: PhotoType,
  cap: number,
): Promise<StoredPhoto | null> => {
  const stored = await storePhoto(container, orderId, bytes, type)
  const svc = service(container)
  const unsent = await svc.listOrderProblemImages(
    { order_id: orderId, report_id: null },
    { order: { created_at: "ASC", id: "ASC" } },
  )
  const place = unsent.findIndex((row) => row.id === stored.id)
  if (place >= 0 && place < cap) return stored
  await svc.deleteOrderProblemImages(stored.id)
  const file = container.resolve(Modules.FILE) as unknown as { deleteFiles(ids: string[]): Promise<void> }
  await file.deleteFiles([stored.id]).catch(() => undefined)
  return null
}

export type ProblemInput = {
  kind: ProblemKind
  itemIds: string[]
  receivedAt: Date | null
  description: string
  phone: string | null
  photoIds: string[]
}

/**
 * Takes the photos for the report in ONE statement: a photo is taken only if it is still this order's and no report
 * has it. The check before creating the report is not enough alone (two reports can both pass it); this is the
 * decision. True only when every photo was taken.
 */
const claimPhotos = async (
  container: MedusaContainer,
  orderId: string,
  reportId: string,
  photoIds: string[],
): Promise<boolean> => {
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    raw(sql: string, bindings: unknown[]): Promise<{ rows?: { id: string }[] }>
  }
  const marks = photoIds.map(() => "?").join(", ")
  const result = await pg.raw(
    `UPDATE order_problem_image SET report_id = ?, updated_at = now()
     WHERE id IN (${marks}) AND order_id = ? AND report_id IS NULL AND deleted_at IS NULL
     RETURNING id`,
    [reportId, ...photoIds, orderId],
  )
  return (result?.rows ?? []).length === photoIds.length
}

/** Gives back whatever photos a failed claim took, so they can go into another report. */
const releasePhotos = async (container: MedusaContainer, reportId: string): Promise<void> => {
  const pg = container.resolve(ContainerRegistrationKeys.PG_CONNECTION) as unknown as {
    raw(sql: string, bindings: unknown[]): Promise<unknown>
  }
  await pg.raw(`UPDATE order_problem_image SET report_id = NULL, updated_at = now() WHERE report_id = ?`, [reportId])
}

export type CreateReportResult =
  { status: "created"; id: string; createdAt: string } | { status: "bad_items" } | { status: "bad_photos" }

/**
 * Creates the report. Every item must be this order's line; every photo must be this order's own upload that no
 * report has taken yet, at most MAX_PHOTOS. A violation is a 4xx the customer's page can word; nothing is written.
 */
export const createReport = async (
  container: MedusaContainer,
  order: AccessibleOrder,
  input: ProblemInput,
): Promise<CreateReportResult> => {
  const unique = (ids: string[]) => [...new Set(ids)]
  const itemIds = unique(input.itemIds)
  if (itemIds.length === 0 || itemIds.some((id) => !order.itemIds.includes(id))) return { status: "bad_items" }
  const photoIds = unique(input.photoIds)
  if (photoIds.length > MAX_PHOTOS) return { status: "bad_photos" }
  const svc = service(container)
  if (photoIds.length) {
    const own = await svc.listOrderProblemImages({ id: photoIds, order_id: order.id, report_id: null })
    if (own.length !== photoIds.length) return { status: "bad_photos" }
  }
  const report = await svc.createOrderProblemReports({
    order_id: order.id,
    kind: input.kind,
    item_ids: itemIds,
    received_at: input.receivedAt,
    description: input.description,
    phone: input.phone,
    status: "new",
  })
  if (photoIds.length && !(await claimPhotos(container, order.id, report.id, photoIds))) {
    // another report took a photo between the check and now: nothing of this one may stay
    await releasePhotos(container, report.id)
    await svc.deleteOrderProblemReports(report.id)
    return { status: "bad_photos" }
  }
  return { status: "created", id: report.id, createdAt: new Date(report.created_at).toISOString() }
}

export type PulledReport = {
  id: string
  order_id: string
  kind: string
  item_ids: string[]
  received_at: string | null
  description: string
  phone: string | null
  status: string
  created_at: string
  pulled_at: string | null
  photos: { id: string; url: string; mime_type: string; size_bytes: number }[]
}

/** The reports for the OS: the oldest first, with their photos. */
export const listReportsForOs = async (
  container: MedusaContainer,
  filter: { status: string; limit: number },
): Promise<PulledReport[]> => {
  const svc = service(container)
  const reports = await svc.listOrderProblemReports(
    { status: filter.status },
    { order: { created_at: "ASC" }, take: filter.limit },
  )
  if (reports.length === 0) return []
  const photos = await svc.listOrderProblemImages({ report_id: reports.map((report) => report.id) })
  return reports.map((report) => ({
    id: report.id,
    order_id: report.order_id,
    kind: report.kind,
    item_ids: Array.isArray(report.item_ids) ? (report.item_ids as string[]) : [],
    received_at: report.received_at ? new Date(report.received_at).toISOString() : null,
    description: report.description,
    phone: report.phone ?? null,
    status: report.status,
    created_at: new Date(report.created_at).toISOString(),
    pulled_at: report.pulled_at ? new Date(report.pulled_at).toISOString() : null,
    photos: photos
      .filter((photo) => photo.report_id === report.id)
      .map((photo) => ({
        id: photo.id,
        url: photo.url,
        mime_type: photo.mime_type,
        size_bytes: Number(photo.size_bytes),
      })),
  }))
}

/** Marks a report pulled by the OS. Idempotent: a second call changes nothing and still answers pulled. */
export const markPulled = async (
  container: MedusaContainer,
  id: string,
  now: Date,
): Promise<"pulled" | "not_found"> => {
  const svc = service(container)
  const [report] = await svc.listOrderProblemReports({ id })
  if (!report) return "not_found"
  if (report.status !== "pulled") await svc.updateOrderProblemReports({ id, status: "pulled", pulled_at: now })
  return "pulled"
}
