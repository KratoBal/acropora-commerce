import type { MedusaContainer } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { WEBSHOP_MAIL_OUTBOX_MODULE } from "../../../modules/webshop-mail-outbox"
import { customerNameOf } from "./facts"
import { osMailRenderConfig, renderWithOs, webshopMailRenderer } from "./os-mail-render"
import {
  type DeliveryResult,
  type MailRenderFacts,
  type OutboxOperations,
  type OutboxRow,
  deliverThroughOutbox,
  runOutbox,
} from "./outbox-delivery"
import { isStuck } from "./outbox-policy"
import type { MailToSend } from "./prepare"
import { sendShopMail } from "./send"

type OutboxService = {
  listWebshopMailOutboxes(filters: Record<string, unknown>, config?: Record<string, unknown>): Promise<OutboxRow[]>
  createWebshopMailOutboxes(data: Record<string, unknown>): Promise<OutboxRow>
  updateWebshopMailOutboxes(data: Record<string, unknown>): Promise<unknown>
}

/** The Medusa side of the outbox (`outbox-delivery.ts`). */
export const outboxOperations = (
  container: MedusaContainer,
  env: NodeJS.ProcessEnv = process.env
): OutboxOperations => {
  const outbox = () => container.resolve<OutboxService>(WEBSHOP_MAIL_OUTBOX_MODULE)
  return {
    findByKey: async (key) => (await outbox().listWebshopMailOutboxes({ idempotency_key: key }))[0] ?? null,
    create: (row) => outbox().createWebshopMailOutboxes(row),
    update: async (id, changes) => {
      await outbox().updateWebshopMailOutboxes({ id, ...changes })
    },
    loadCommon: async (orderId) => {
      const query = container.resolve(ContainerRegistrationKeys.QUERY)
      const { data } = await query.graph({
        entity: "order",
        filters: { id: orderId },
        fields: ["created_at", "billing_address.first_name", "billing_address.last_name"],
      })
      const order = data?.[0] as
        | {
            created_at?: Date | string
            billing_address?: { first_name?: string; last_name?: string }
          }
        | undefined
      return {
        customer_name: customerNameOf(order?.billing_address),
        order_created_at: order?.created_at ? new Date(order.created_at).toISOString() : null,
      }
    },
    render: (request) => renderWithOs(request, osMailRenderConfig(env)),
    send: async (mail) => {
      await sendShopMail(container.resolve(Modules.NOTIFICATION), mail)
    },
    now: () => new Date(),
  }
}

/**
 * EVERY SHOP MAIL GOES HERE (Levélsablonok). With the switch off (the
 * default), the built-in text is sent exactly as before. With
 * ACROPORA_WEBSHOP_MAIL_RENDERER=os, the mail goes through the outbox and the
 * OS renders it; if the OS cannot now, the mail waits (`queued`), and the
 * caller says so instead of reporting a failure.
 */
export const deliverShopMail = async (
  container: MedusaContainer,
  mail: MailToSend,
  env: NodeJS.ProcessEnv = process.env
): Promise<DeliveryResult> => {
  if (webshopMailRenderer(env) !== "os" || !mail.render) {
    await sendShopMail(container.resolve(Modules.NOTIFICATION), mail)
    return { sent: true }
  }
  return deliverThroughOutbox(mail as MailToSend & { render: MailRenderFacts }, outboxOperations(container, env))
}

/** A row's order number, wherever its template keeps it (for the OS's list). */
export const displayIdOf = (facts: Record<string, unknown>): string | number | null => {
  const pick = (value: unknown) => {
    const id = (value as { display_id?: unknown } | null | undefined)?.display_id
    return typeof id === "string" || typeof id === "number" ? id : null
  }
  return (
    pick(facts.order) ??
    pick(facts.shipped) ??
    pick(facts.refund) ??
    pick(Array.isArray(facts.orders) ? facts.orders[0] : null)
  )
}

/** Unsent rows, oldest first (the outbox is small: a mail leaves within minutes). */
const unsent = (container: MedusaContainer) =>
  container
    .resolve<OutboxService>(WEBSHOP_MAIL_OUTBOX_MODULE)
    .listWebshopMailOutboxes({ sent_at: null }, { order: { created_at: "ASC" }, take: 1000 })

/** The retry job's pass (`jobs/webshop-mail-outbox.ts`). */
export const runWebshopMailOutbox = async (container: MedusaContainer, env: NodeJS.ProcessEnv = process.env) => {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const ops = outboxOperations(container, env)
  return runOutbox({
    ...ops,
    // due: a transient failure whose time came, or a row whose first try never finished
    due: async (now) =>
      (await unsent(container)).filter((row) => {
        const next = (row as OutboxRow & { next_attempt_at?: Date | string | null }).next_attempt_at
        if (row.failure_kind === "transient") return !!next && new Date(next).getTime() <= now.getTime()
        return row.failure_kind === null && now.getTime() - new Date(row.created_at).getTime() >= 2 * 60 * 1000
      }),
    unsentToReport: async () => (await unsent(container)).filter((row) => !row.alerted_at),
    report: (row) =>
      logger.warn(
        `Webshop mail ${row.template} for order ${row.resource_id} is not sent (${row.failure_kind ?? "waiting"}): ${
          (row as OutboxRow & { last_error?: string | null }).last_error ?? "no answer from the OS yet"
        }`
      ),
  })
}

export type StuckMail = {
  id: string
  template: string
  display_id: string | number | null
  resource_id: string
  to: string
  attempts: number
  failure_kind: string | null
  last_error: string | null
  created_at: string
  next_attempt_at: string | null
  alerted_at: string | null
}

const iso = (value: Date | string | null | undefined) => (value ? new Date(value).toISOString() : null)

const stuckMailOf = (row: OutboxRow): StuckMail => {
  const extra = row as OutboxRow & {
    last_error?: string | null
    next_attempt_at?: Date | string | null
  }
  return {
    id: row.id,
    template: row.template,
    display_id: displayIdOf(row.facts),
    resource_id: row.resource_id,
    to: row.to,
    attempts: row.attempts,
    failure_kind: row.failure_kind,
    last_error: extra.last_error ?? null,
    created_at: iso(row.created_at)!,
    next_attempt_at: iso(extra.next_attempt_at),
    alerted_at: iso(row.alerted_at),
  }
}

/**
 * THE MAILS THAT DID NOT GO (Balázs: reported in the OS and to acrobot): a
 * permanent or config failure, or an hour unsent. Newest first, paged.
 */
export const stuckWebshopMails = async (
  container: MedusaContainer,
  page: { limit: number; offset: number },
  now: Date = new Date()
): Promise<{ items: StuckMail[]; count: number }> => {
  const stuck = (await unsent(container)).filter((row) => isStuck(row, now)).reverse()
  return {
    count: stuck.length,
    items: stuck.slice(page.offset, page.offset + page.limit).map(stuckMailOf),
  }
}

/**
 * ONE STUCK MAIL BACK IN LINE (nautilus 26563: the button beside the error on
 * the OS's Levélsablonok page, after the template is mended). The row becomes
 * due now, as a transient one, and may be reported again if it sticks; the
 * job's next pass (within two minutes) renders and sends it.
 */
export const requeueWebshopMail = async (
  container: MedusaContainer,
  id: string,
  now: Date = new Date()
): Promise<{ status: "not_found" } | { status: "sent" } | { status: "requeued"; item: StuckMail }> => {
  const outbox = container.resolve<OutboxService>(WEBSHOP_MAIL_OUTBOX_MODULE)
  const row = (await outbox.listWebshopMailOutboxes({ id }))[0]
  if (!row) return { status: "not_found" }
  if (row.sent_at) return { status: "sent" }
  const changes = {
    failure_kind: "transient",
    next_attempt_at: now,
    alerted_at: null,
  }
  await outbox.updateWebshopMailOutboxes({ id, ...changes })
  return {
    status: "requeued",
    item: stuckMailOf({ ...row, ...changes } as OutboxRow),
  }
}
