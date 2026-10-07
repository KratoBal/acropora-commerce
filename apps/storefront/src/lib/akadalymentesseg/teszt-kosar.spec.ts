import { afterEach, describe, expect, it, vi } from "vitest"

import { tesztKosar } from "./teszt-kosar"

/**
 * A TESZT-KOSAR CSAK A TESZT BOLTBA IR (FE-9).
 *
 * MI PIROSIT: ha egy nem teszt-hosztra allitott backenddel a fuggveny barmilyen
 * hivast indit (egy elesre allitott kornyezetben futtatott teszt kosarat hagyna
 * az eles boltban).
 */
afterEach(() => vi.unstubAllGlobals())

describe("a teszt-kosár őrzője", () => {
  it("éles vagy ismeretlen hoszton egyetlen hívást sem indít", async () => {
    const hivas = vi.fn()
    vi.stubGlobal("fetch", hivas)
    for (const backend of [
      "https://commerce.acropora.hu",
      "https://commerce-stage.acropora.hu.example.com",
    ]) {
      const r = await tesztKosar({ backend, kulcs: "pk", orszag: "hu" })
      expect(r.kosarId).toBeNull()
    }
    expect(hivas).not.toHaveBeenCalled()
  })

  it("a teszt hoszton hív (a mérés kontrollja)", async () => {
    const hivas = vi.fn(async () => new Response("{}", { status: 500 }))
    vi.stubGlobal("fetch", hivas)
    await expect(
      tesztKosar({
        backend: "https://commerce-stage.acropora.hu",
        kulcs: "pk",
        orszag: "hu",
      }),
    ).rejects.toThrow(/500/)
    expect(hivas).toHaveBeenCalled()
  })
})
