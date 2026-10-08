// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  atiranyitasCelja,
  atiranyitasKulcs,
  atiranyitasLista,
  atiranyitasListaUrites,
} from "./atiranyitas"

/**
 * A RÉGI CÍM KULCSA ÉS A LISTA (SEO P0 PR 7c). MI PIROSIT: a kulcs eltér az OS
 * normalizálásától (percent-kód, NFD, záró `/`, nagybetű); a lista kérésenként
 * hív; egy betöltési hiba átirányítást vagy kivételt ad; a hiba után azonnal újra
 * hív.
 */
describe("atiranyitasKulcs (ugyanaz, mint az OS redirect-path.ts-e, kisbetűsen)", () => {
  it("percent-dekódolt, NFC, záró / nélkül, kisbetűs", () => {
    expect(atiranyitasKulcs("/Tropic-Pro-Reef/")).toBe("/tropic-pro-reef")
    expect(atiranyitasKulcs("/sz%C3%A1raz")).toBe("/száraz")
    expect(atiranyitasKulcs("/sza\u0301raz")).toBe("/száraz")
    expect(atiranyitasKulcs("/Pumpa-3000-liter/ora")).toBe(
      "/pumpa-3000-liter/ora",
    )
    expect(atiranyitasKulcs("/")).toBe("/")
  })

  it("hibás percent-kód nyersen, szóközös út nem kulcs", () => {
    expect(atiranyitasKulcs("/100%-os")).toBe("/100%-os")
    expect(atiranyitasKulcs("/a%20b")).toBeNull()
  })
})

describe("atiranyitasLista", () => {
  afterEach(() => {
    atiranyitasListaUrites()
    vi.unstubAllGlobals()
  })
  const lista = { redirects: [["/pumpa", "/hu/termek/p", 301]] }

  it("egyszer tölt, és 300 másodpercig a memóriából ad", async () => {
    const lekeres = vi.fn(async () => Response.json(lista))
    vi.stubGlobal("fetch", lekeres)
    const elso = await atiranyitasLista("http://m.test", "pk", 0)
    await atiranyitasLista("http://m.test", "pk", 299_000)
    expect(lekeres).toHaveBeenCalledOnce()
    expect(atiranyitasCelja(elso, "/Pumpa/")).toEqual({
      cel: "/hu/termek/p",
      statusz: 301,
    })
    await atiranyitasLista("http://m.test", "pk", 300_000)
    expect(lekeres).toHaveBeenCalledTimes(2)
  })

  it("a párhuzamos kérések egy lekérést várnak (#534 1.)", async () => {
    const lekeres = vi.fn(async () => Response.json(lista))
    vi.stubGlobal("fetch", lekeres)
    const [a, b] = await Promise.all([
      atiranyitasLista("http://m.test", "pk", 0),
      atiranyitasLista("http://m.test", "pk", 0),
    ])
    expect(lekeres).toHaveBeenCalledOnce()
    expect(a).toBe(b)
  })

  it("egy lógó backend 2 másodperc után üres listát ad, és nem áll (#534 1.)", async () => {
    const lekeres = vi.fn(
      (_: unknown, init?: RequestInit) =>
        new Promise<Response>((_, elutasit) =>
          init?.signal?.addEventListener("abort", () =>
            elutasit(new Error("abort")),
          ),
        ),
    )
    vi.stubGlobal("fetch", lekeres)
    const kezdet = Date.now()
    const ures = await atiranyitasLista("http://m.test", "pk", 0)
    expect(Date.now() - kezdet).toBeLessThan(4_000)
    expect(atiranyitasCelja(ures, "/pumpa")).toBeNull()
  })

  it("betöltési hiba: üres lista, nincs kivétel, és 30 másodpercig nem próbálja újra", async () => {
    const lekeres = vi.fn(async () => new Response("x", { status: 503 }))
    vi.stubGlobal("fetch", lekeres)
    const ures = await atiranyitasLista("http://m.test", "pk", 0)
    expect(atiranyitasCelja(ures, "/pumpa")).toBeNull()
    await atiranyitasLista("http://m.test", "pk", 29_000)
    expect(lekeres).toHaveBeenCalledOnce()
  })
})
