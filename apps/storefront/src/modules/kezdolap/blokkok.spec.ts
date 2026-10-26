import { describe, expect, it } from "vitest"

import { BLOKK_KULCSOK, megjeleno } from "./blokkok"

/*
  A BLOKKOK SORRENDJE ES LATHATOSAGA. MI PIROSIT: ha a null/hiany nem a terv
  sorrendjet adja minden blokkal; ha a lista sorrendje nem a megjelenes
  sorrendje; ha egy rejtett blokk megjelenik; ha egy SERTETT lista (hianyzo,
  ismetlodo, ismeretlen kulcs, nem logikai `visible`) reszben ervenyesul ahelyett,
  hogy a lap sorrendjere esne vissza.
*/
const lista = (
  atalakit: (b: { key: string; visible: boolean }[]) => unknown = (b) => b,
) => atalakit(BLOKK_KULCSOK.map((key) => ({ key, visible: true })))

describe("a megjelenő blokkok", () => {
  it("beállítás nélkül a terv sorrendje, minden látszik", () => {
    for (const nincs of [null, undefined])
      expect(megjeleno(nincs)).toEqual([...BLOKK_KULCSOK])
  })

  it("a lista sorrendje a megjelenés sorrendje", () => {
    const fordit = (lista() as unknown[]).slice().reverse()
    expect(megjeleno(fordit)).toEqual([...BLOKK_KULCSOK].reverse())
  })

  it("a rejtett blokk nem jelenik meg, a többi sorrendben marad", () => {
    const rejtett = lista((b) =>
      b.map((x) => ({ ...x, visible: x.key !== "hero" && x.key !== "markak" })),
    )
    expect(megjeleno(rejtett)).toEqual(
      BLOKK_KULCSOK.filter((k) => k !== "hero" && k !== "markak"),
    )
    expect(
      megjeleno(lista((b) => b.map((x) => ({ ...x, visible: false })))),
    ).toEqual([])
  })

  it("sérült lista a terv sorrendjére esik vissza, nem érvényesül félig", () => {
    const sertett: unknown[] = [
      lista((b) => b.slice(1)), // hiányzik egy
      lista((b) => [b[0], ...b.slice(0, 7)]), // ismétlődik egy
      lista((b) => [...b, { key: "hero", visible: true }]), // kilenc elem
      lista((b) => [...b.slice(1), { key: "sajat-x", visible: true }]), // ismeretlen kulcs
      lista((b) => b.map((x) => ({ ...x, visible: "true" }))), // nem logikai
      lista((b) =>
        b.map((x) => ({ ...x, visible: x.key !== "hero" })).slice(1),
      ),
      "nem lista",
      [null, 1, "x"],
    ]
    for (const s of sertett) expect(megjeleno(s)).toEqual([...BLOKK_KULCSOK])
  })
})
