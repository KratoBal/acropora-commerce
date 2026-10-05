import type { WebshopMailRenderRequest } from "./facts"

/**
 * THE OS RENDERS THE SHOP'S MAIL (Levélsablonok; Balázs, 2026-10-05 20:11
 * UTC). This file only asks; what to do with the answer is the outbox's
 * (`outbox-policy.ts`).
 *
 * Settings:
 *   ACROPORA_WEBSHOP_MAIL_RENDERER = "os"   the OS renders; anything else: the
 *                                           shop's own builders, as before (the
 *                                           switch flips after the stage run)
 *   ACROPORA_OS_MAIL_RENDER_URL             the OS's render endpoint
 *   ACROPORA_OS_MAIL_TOKEN                  the service token its guard accepts
 *                                           (Authorization: Bearer)
 */
export type OsMailRenderConfig = { url: string; token: string }

export const webshopMailRenderer = (env: NodeJS.ProcessEnv = process.env): "os" | "local" =>
  env.ACROPORA_WEBSHOP_MAIL_RENDERER?.trim() === "os" ? "os" : "local"

export const osMailRenderConfig = (env: NodeJS.ProcessEnv = process.env): OsMailRenderConfig | null => {
  const url = env.ACROPORA_OS_MAIL_RENDER_URL?.trim() ?? ""
  const token = env.ACROPORA_OS_MAIL_TOKEN?.trim() ?? ""
  if (!token || !/^https?:\/\/[^/\s]+/.test(url)) return null
  return { url, token }
}

export type RenderedMail = { subject: string; html: string; text: string; customized: boolean }

/**
 * WHAT A FAILED RENDER MEANS (nautilus 26557):
 *
 *   transient  5xx, a timeout, no connection: tried again later
 *   permanent  400 (a bad request), 422 (the stored template cannot render),
 *              an empty answer: it does not mend itself, so it is reported at
 *              once instead of being retried every few minutes
 *   config     401/403, or no settings: the token or the address is wrong
 */
export type OsRenderFailure = { kind: "transient" | "permanent" | "config"; message: string }

export type OsRenderResult = ({ ok: true } & RenderedMail) | ({ ok: false } & OsRenderFailure)

type Fetcher = (
  url: string,
  init: { method: string; headers: Record<string, string>; body: string; signal: AbortSignal }
) => Promise<{ status: number; json: () => Promise<unknown> }>

export const OS_RENDER_TIMEOUT_MS = 10_000

const messageOf = (body: unknown, fallback: string) => {
  const message = (body as { message?: unknown } | null)?.message
  return typeof message === "string" && message.trim() ? message.trim() : fallback
}

export const renderWithOs = async (
  request: WebshopMailRenderRequest,
  config: OsMailRenderConfig | null,
  fetcher: Fetcher = fetch as unknown as Fetcher,
  timeoutMs = OS_RENDER_TIMEOUT_MS
): Promise<OsRenderResult> => {
  if (!config) {
    return {
      ok: false,
      kind: "config",
      message: "Az OS levél-renderelője nincs beállítva (ACROPORA_OS_MAIL_RENDER_URL, ACROPORA_OS_MAIL_TOKEN).",
    }
  }
  const abort = new AbortController()
  const timer = setTimeout(() => abort.abort(), timeoutMs)
  try {
    const response = await fetcher(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
      body: JSON.stringify(request),
      signal: abort.signal,
    })
    const body: unknown = await response.json().catch(() => null)

    if (response.status === 401 || response.status === 403) {
      return { ok: false, kind: "config", message: messageOf(body, "Az OS nem fogadta el a levél-renderelő tokenjét.") }
    }
    if (response.status >= 500) {
      return { ok: false, kind: "transient", message: messageOf(body, `Az OS hibát adott (${response.status}).`) }
    }
    if (response.status >= 400) {
      return { ok: false, kind: "permanent", message: messageOf(body, `Az OS elutasította a levelet (${response.status}).`) }
    }

    const mail = body as Partial<RenderedMail> | null
    if (
      typeof mail?.subject !== "string" ||
      !mail.subject.trim() ||
      typeof mail.html !== "string" ||
      !mail.html.trim() ||
      typeof mail.text !== "string" ||
      !mail.text.trim()
    ) {
      return { ok: false, kind: "permanent", message: "Az OS üres vagy hiányos levelet adott vissza." }
    }
    return { ok: true, subject: mail.subject, html: mail.html, text: mail.text, customized: mail.customized === true }
  } catch (error) {
    return {
      ok: false,
      kind: "transient",
      message: abort.signal.aborted
        ? "Az OS nem válaszolt időben."
        : `Az OS nem érhető el: ${error instanceof Error ? error.message : String(error)}`,
    }
  } finally {
    clearTimeout(timer)
  }
}
