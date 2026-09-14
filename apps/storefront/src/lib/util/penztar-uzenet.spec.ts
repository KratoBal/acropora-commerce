import { describe, expect, it } from "vitest"

import {
  FIZETES_ELUTASITVA,
  FIZETES_MOST_NEM_SIKERULT,
  RENDELES_ELUTASITVA,
  RENDELES_MOST_NEM_SIKERULT,
  SZALLITAS_ELUTASITVA,
  SZALLITAS_MOST_NEM_SIKERULT,
  fizetesUzenet,
  rendelesUzenet,
  szallitasUzenet,
} from "./penztar-uzenet"

/**
 * A PÉNZTÁR HÁROM MONDATPÁRJA.
 *
 * A vágás mindháromnál ugyanaz (4xx kontra minden más), a MONDATOK viszont
 * nem: a vevő más teendőt kap attól, hogy a szállítási módot kell-e
 * újraválasztania, a fizetésit, vagy azt kell megnéznie, átment-e a rendelése.
 *
 * === KALIBRÁCIÓ ===
 *
 * A számok a mérés után kerülnek ide; a jóslat fájlban áll a futtatás előtt.
 */

const PAROK = [
  {
    nev: "szállítási mód",
    fuggveny: szallitasUzenet,
    elutasitva: SZALLITAS_ELUTASITVA,
    egyeb: SZALLITAS_MOST_NEM_SIKERULT,
  },
  {
    nev: "fizetési mód",
    fuggveny: fizetesUzenet,
    elutasitva: FIZETES_ELUTASITVA,
    egyeb: FIZETES_MOST_NEM_SIKERULT,
  },
  {
    nev: "rendelés",
    fuggveny: rendelesUzenet,
    elutasitva: RENDELES_ELUTASITVA,
    egyeb: RENDELES_MOST_NEM_SIKERULT,
  },
]

describe.each(PAROK)("a $nev üzenete az állapotkódból következik", (par) => {
  it("a 4xx a vevő VÁLASZTÁSÁRA mutat", () => {
    expect(par.fuggveny(400)).toBe(par.elutasitva)
    expect(par.fuggveny(409)).toBe(par.elutasitva)
    expect(par.fuggveny(422)).toBe(par.elutasitva)
  })

  it("az 5xx és a kód nélküli hiba NEM a választásra mutat", () => {
    expect(par.fuggveny(500)).toBe(par.egyeb)
    expect(par.fuggveny(503)).toBe(par.egyeb)
    expect(par.fuggveny(undefined)).toBe(par.egyeb)
  })

  it("a határok a 400 és a 499 között húzódnak", () => {
    expect(par.fuggveny(399)).toBe(par.egyeb)
    expect(par.fuggveny(400)).toBe(par.elutasitva)
    expect(par.fuggveny(499)).toBe(par.elutasitva)
    expect(par.fuggveny(500)).toBe(par.egyeb)
  })

  /**
   * ISMERT POZITÍV KONTROLL páronként: a két mondat tényleg különbözik.
   * Enélkül a fenti tíz állítást egy összeomlott pár is kielégítené.
   */
  it("a pár két mondata nem ugyanaz", () => {
    expect(par.elutasitva).not.toBe(par.egyeb)
  })

  it("mindkét mondat magyar, és ékezetes", () => {
    expect(par.elutasitva).toMatch(/[áéíóöőúüű]/)
    expect(par.egyeb).toMatch(/[áéíóöőúüű]/)
  })
})

/**
 * ÉS A HÁROM PÁR SEM OLVAD EGYBE.
 *
 * Ez nem szőrszálhasogatás, hanem épp az, amiért az egészet csináljuk: a
 * legkézenfekvőbb „egyszerűsítés" az lenne, hogy mindhárom lépés ugyanazt az
 * általános mondatot kapja. Attól a vevő megint nem tudná, mit csináljon --
 * csak most magyarul nem tudná.
 */
describe("a hat mondat mind különbözik", () => {
  it("nincs két egyforma", () => {
    const mind = [
      SZALLITAS_ELUTASITVA,
      SZALLITAS_MOST_NEM_SIKERULT,
      FIZETES_ELUTASITVA,
      FIZETES_MOST_NEM_SIKERULT,
      RENDELES_ELUTASITVA,
      RENDELES_MOST_NEM_SIKERULT,
    ]

    expect(new Set(mind).size).toBe(6)
  })

  /**
   * A RENDELÉS MONDATA NEM KÜLD VAK ÚJRAPRÓBÁLÁSRA.
   *
   * Ha a hiba a válasz útján keletkezett, a rendelés LEHET, hogy létrejött, és
   * egy vak újrapróbálás második rendelést szülhet. Hogy a Medusa
   * `cart.complete` hívása idempotens-e, azt NEM mértem meg (ahhoz valódi
   * rendelést kellene indítani az élő bolton). Ezért a mondat előbb
   * megnézetni kér, és ez mindkét lehetséges világban helyes tanács.
   */
  it("a rendelés hibája ellenőrzésre kér, nem újrapróbálásra", () => {
    expect(RENDELES_MOST_NEM_SIKERULT).toContain("nézd meg")
    expect(RENDELES_MOST_NEM_SIKERULT).not.toMatch(/Próbáld meg újra\./)
    expect(SZALLITAS_MOST_NEM_SIKERULT).toMatch(/Próbáld meg újra\./)
  })
})
