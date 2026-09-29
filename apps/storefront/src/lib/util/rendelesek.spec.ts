import { describe, expect, it } from "vitest"

import {
  allapotFajta,
  fizetesiAllapot,
  rendelesCsoportok,
  rendelesDatum,
  rendelesDatumRovid,
  rendelesSzam,
  kapcsoltFelirat,
  kapcsoltRendeles,
} from "./rendelesek"

const allapot = (order_id: string, status: string, label = status) => ({
  order_id,
  status,
  label,
  updated_at: "2026-09-29T10:00:00.000Z",
})

/**
 * A RENDELESEK CSOPORTOSITASA (249:37). MI PIROSIT: ha egy lezart rendeles
 * felul marad; ha egy nyitott (akar Visszaigazolva) lecsuszik; ha egy allapot
 * nelkuli rendeles eltunik vagy lezartnak szamit; ha a sorrend felborul.
 */
describe("a rendelések csoportosítása", () => {
  const rendelesek = [
    { id: "a" },
    { id: "b" },
    { id: "c" },
    { id: "d" },
    { id: "e" },
  ]
  const allapotok = [
    allapot("a", "confirmed"),
    allapot("b", "closed"),
    allapot("c", "out_for_delivery"),
    allapot("d", "closed_unsuccessfully"),
  ]

  it("a két lezárt a Korábbiak közé, minden más felül, a sorrend marad", () => {
    const { nyitott, korabbi } = rendelesCsoportok(rendelesek, allapotok)
    expect(nyitott.map((s) => s.rendeles.id)).toEqual(["a", "c", "e"])
    expect(korabbi.map((s) => s.rendeles.id)).toEqual(["b", "d"])
  })

  it("az állapot nélküli rendelés nyitott, állapot nélkül", () => {
    const { nyitott } = rendelesCsoportok(rendelesek, allapotok)
    expect(nyitott.find((s) => s.rendeles.id === "e")?.allapot).toBeNull()
  })
})

describe("a címke fajtája, a dátum és a szám", () => {
  it("nyitott, teljesítve, sikertelen", () => {
    expect(allapotFajta("pending_processing")).toBe("nyitott")
    expect(allapotFajta("confirmed")).toBe("nyitott")
    expect(allapotFajta("closed")).toBe("teljesitve")
    expect(allapotFajta("closed_unsuccessfully")).toBe("sikertelen")
  })

  /*
   * A DATUM BUDAPESTI NAP, NEM UTC: este fel 12-kor (UTC) Budapesten mar a
   * kovetkezo nap van.
   */
  it("a dátum budapesti idő szerint áll, hosszú és rövid alakban", () => {
    expect(rendelesDatum("2026-09-28T22:30:00.000Z")).toBe(
      "2026. szeptember 29.",
    )
    expect(rendelesDatumRovid("2026-09-28T10:00:00.000Z")).toBe("2026. 09. 28.")
    expect(rendelesDatum(null)).toBe("")
  })

  it("a rendelésszám a Medusa sorszáma, a fizetés magyarul", () => {
    expect(rendelesSzam(42)).toBe("#42")
    expect(rendelesSzam(null)).toBe("")
    expect(fizetesiAllapot("captured")).toBe("kifizetve")
    expect(fizetesiAllapot("valami_uj")).toBe("")
  })
})

describe("a pár-rendelés (P4-2)", () => {
  it("a metadatából olvassa, mindkét irányban, és mondja, melyik a bolti", () => {
    expect(kapcsoltRendeles({ acropora_pickup_order_id: "order_2" })).toEqual({
      id: "order_2",
      bolti: true,
    })
    expect(kapcsoltRendeles({ acropora_parent_order_id: "order_1" })).toEqual({
      id: "order_1",
      bolti: false,
    })
    expect(kapcsoltRendeles({})).toBeNull()
    expect(kapcsoltRendeles(null)).toBeNull()
    expect(kapcsoltRendeles({ acropora_pickup_order_id: 5 })).toBeNull()
  })

  it("a felirat a pár számát és fajtáját adja", () => {
    expect(kapcsoltFelirat(13, true)).toBe("Egy leadásból: #13, bolti átvétel")
    expect(kapcsoltFelirat(12, false)).toBe("Egy leadásból: #12, kiszállítás")
  })
})
