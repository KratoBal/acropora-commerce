import { MedusaContainer } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"

import { ORDER_BUSINESS_STATUS_MODULE } from "../../../modules/order-business-status"
import OrderBusinessStatusModuleService from "../../../modules/order-business-status/service"
import { nextBusinessStatuses } from "../../../modules/order-business-status/transitions"
import {
  ORDER_BUSINESS_STATUS_LABELS,
  OrderBusinessStatus,
} from "../../../modules/order-business-status/types"
import { statusMailTrigger } from "../../../workflows/utils/webshop-mail/status-mail"

/**
 * THE BUSINESS STATUS FOR THE ACROPORA OS (its "Rendelések" page). The OS
 * reads it here because there is no module link from the order: the plain
 * `GET /admin/orders` cannot carry it.
 *
 * Unlike the customer view, the history keeps `actor` and `source`: the OS
 * shows who moved the order. `next_statuses` are the steps an admin may take
 * now, from the same table the transition is checked against.
 */
export type AdminOrderBusinessStatusDetail = {
  order_id: string
  status: OrderBusinessStatus
  label: string
  changed_at: string
  next_statuses: { status: OrderBusinessStatus; label: string }[]
  history: {
    from_status: OrderBusinessStatus | null
    from_label: string | null
    to_status: OrderBusinessStatus
    to_label: string
    actor: string
    source: string
    created_at: string
    /** The customer's mail of this change: the newest one, resends included; null: none. */
    notification: RowNotification | null
  }[]
}

/**
 * "Értesítő email elküldve" in the OS's history table (Rendelések prompt,
 * point 10): sent, failed or still pending, and when. `resent` counts the
 * mails beyond the first.
 */
export type RowNotification = {
  status: "sent" | "failed" | "pending"
  at: string
  template: string
  resent: number
}

type StoredNotification = {
  template: string
  trigger_type?: string | null
  status: "pending" | "success" | "failure"
  created_at: Date | string
}

const NOTIFICATION_STATUS: Record<StoredNotification["status"], RowNotification["status"]> = {
  success: "sent",
  failure: "failed",
  pending: "pending",
}

const summary = (mails: StoredNotification[]): RowNotification | null => {
  const newest = mails.at(-1)
  if (!newest) return null
  return {
    status: NOTIFICATION_STATUS[newest.status] ?? "pending",
    at: iso(newest.created_at),
    template: newest.template,
    resent: mails.length - 1,
  }
}

/**
 * The order's mails, oldest first. When the shop has no notification module
 * (the mail switch off), there are none: every row says null.
 */
const orderNotifications = async (scope: MedusaContainer, orderId: string): Promise<StoredNotification[]> => {
  let module: { listNotifications(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<StoredNotification[]> }
  try {
    module = scope.resolve(Modules.NOTIFICATION)
  } catch {
    return []
  }
  const found = await module.listNotifications(
    { resource_id: orderId },
    { order: { created_at: "ASC" } },
  )
  return [...found].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
}

/**
 * Which mails belong to a history row. The creation row's mail is the order
 * confirmation; any other row's are the ones whose trigger names the row. A
 * Kiszállítás row with none of its own shows the "Feladtuk" mail, the one the
 * status mail stood back for (`shipped_mail_sent`).
 */
const mailsOfRow = (
  row: { id?: string; source: string; to_status: string },
  mails: StoredNotification[],
): StoredNotification[] => {
  if (row.source === "order_created") return mails.filter((mail) => mail.template === "order-placed")
  const own = row.id ? mails.filter((mail) => mail.trigger_type === statusMailTrigger(row.id!)) : []
  if (own.length || row.to_status !== "out_for_delivery") return own
  return mails.filter((mail) => mail.template === "order-shipped")
}

const label = (status: string): string =>
  ORDER_BUSINESS_STATUS_LABELS[status as OrderBusinessStatus] ?? status

const iso = (value: Date | string): string => new Date(value).toISOString()

export async function adminStatusDetail(
  scope: MedusaContainer,
  orderId: string,
): Promise<AdminOrderBusinessStatusDetail | null> {
  const service = scope.resolve<OrderBusinessStatusModuleService>(
    ORDER_BUSINESS_STATUS_MODULE,
  )
  try {
    const { status, history } =
      await service.retrieveOrderBusinessStatusForOrder(orderId)
    const current = status.status as OrderBusinessStatus
    const latest = history.at(-1)
    const mails = await orderNotifications(scope, orderId)
    return {
      order_id: status.order_id,
      status: current,
      label: label(current),
      // the history's last row is the change; the status row's own time is the fallback
      changed_at: iso(latest?.created_at ?? status.updated_at),
      next_statuses: nextBusinessStatuses(current, "admin").map((to) => ({
        status: to,
        label: label(to),
      })),
      history: history.map((row) => ({
        from_status: (row.from_status as OrderBusinessStatus | null) ?? null,
        from_label: row.from_status ? label(row.from_status) : null,
        to_status: row.to_status as OrderBusinessStatus,
        to_label: label(row.to_status),
        actor: row.actor,
        source: row.source,
        created_at: iso(row.created_at),
        notification: summary(mailsOfRow(row, mails)),
      })),
    }
  } catch (error) {
    if (
      error instanceof MedusaError &&
      error.type === MedusaError.Types.NOT_FOUND
    )
      return null
    throw error
  }
}
