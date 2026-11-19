import { describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ redirect: vi.fn() }))
vi.mock("next/navigation", () => ({ redirect: nav.redirect }))

import BelepesreIranyit from "./default"

/**
 * A KIJELENTKEZETT VEVO A FIOK ALOLDALAIN (2026-11-19). MI PIROSIT: ha az alap-hely nem
 * iranyitana a belepo lapra; ha az iranyitas az orszagkodot elhagyna (a `/hu` bolt `/en-hu`
 * vevoje is a sajat nyelvu belepoje kapja); ha az iranyitas nem az `/account` gyokerre mutatna
 * (ott van a belepo), hanem egy aloldalra (vegtelen kor).
 */
describe("a fiok alap-helye bejelentkezes nelkul", () => {
  it.each(["hu", "en-hu"])("a(z) %s bolt belepoje a cel", async (kod) => {
    nav.redirect.mockClear()
    await BelepesreIranyit({ params: Promise.resolve({ countryCode: kod }) })
    expect(nav.redirect).toHaveBeenCalledTimes(1)
    expect(nav.redirect).toHaveBeenCalledWith(`/${kod}/account`)
  })
})
