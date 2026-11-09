import { describe, expect, it, vi } from "vitest"

import { HIRLEVEL_LINK_UT, hirlevelLink } from "./hirlevel-link"

/*
  A HIRLEVEL KET LINKJE (kettos megerosites, d707cf5f). MI PIROSIT: egy rossz
  alaku token, ami megis a bolthoz megy; a bolt negy valasza kozul barmelyik
  mas allapotot ad; egy 429 nem a korlat-uzenetet adja; a bolt 400-a (rossz
  alaku token) hibakent jelenik meg ervenytelen helyett; egy ismeretlen
  valasz sikernek latszik.
*/
const TOKEN = "A".repeat(42) + "_"
const hibaKoddal = (status: number) => Object.assign(new Error("x"), { status })

describe("hirlevelLink", () => {
  it("HL-ALAK: rossz alaku tokent el sem kuld", async () => {
    const kuld = vi.fn()
    for (const token of [
      "",
      "A".repeat(42),
      "A".repeat(44),
      "A".repeat(42) + ".",
    ])
      expect([token, await hirlevelLink(token, kuld)]).toEqual([
        token,
        { allapot: "ervenytelen" },
      ])
    expect(kuld).not.toHaveBeenCalled()
  })

  it("HL-VALASZ: a bolt negy valasza negy allapot, a token a torzsben megy", async () => {
    const esetek = [
      ["confirmed", "megerositve"],
      ["unsubscribed", "leiratkozva"],
      ["invalid", "ervenytelen"],
      ["expired", "lejart"],
    ] as const
    for (const [result, allapot] of esetek) {
      const kuld = vi.fn(async () => ({ result }))
      expect(await hirlevelLink(TOKEN, kuld)).toEqual({ allapot })
      expect(kuld).toHaveBeenCalledWith({ token: TOKEN })
    }
  })

  it("HL-HIBA: 429 a korlat, 400 az ervenytelen link, minden mas es az ismeretlen valasz hiba", async () => {
    expect(
      await hirlevelLink(TOKEN, async () => Promise.reject(hibaKoddal(429))),
    ).toEqual({ allapot: "hiba", ok: "korlat" })
    expect(
      await hirlevelLink(TOKEN, async () => Promise.reject(hibaKoddal(400))),
    ).toEqual({ allapot: "ervenytelen" })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined)
    expect(
      await hirlevelLink(TOKEN, async () => Promise.reject(hibaKoddal(500))),
    ).toEqual({ allapot: "hiba", ok: "hiba" })
    expect(
      await hirlevelLink(TOKEN, async () => ({ result: "subscribed" })),
    ).toEqual({ allapot: "hiba", ok: "hiba" })
    // a naplo sorban nincs token
    expect(JSON.stringify(warn.mock.calls)).not.toContain(TOKEN)
    warn.mockRestore()
  })

  it("HL-UT: a ket lap a bolt ket vegpontjat hivja", () => {
    expect(HIRLEVEL_LINK_UT).toEqual({
      megerosites: "/store/newsletter-subscriptions/confirm",
      leiratkozas: "/store/newsletter-subscriptions/unsubscribe",
    })
  })
})
