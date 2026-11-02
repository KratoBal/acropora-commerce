import { readFileSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, it } from "vitest"

import {
  FIZETES_ELUTASITVA,
  FIZETES_MOST_NEM_SIKERULT,
  RENDELES_ELUTASITVA,
  RENDELES_MOST_NEM_SIKERULT,
  SZALLITAS_ELUTASITVA,
  SZALLITAS_MOST_NEM_SIKERULT,
  JOGI_DOKUMENTUM_HIANY_KOD,
  RENDELES_JOGI_HIANY,
  fizetesHibaUzenet,
  fizetesUzenet,
  RENDELES_KEDVEZMENY_BONTAS,
  rendelesHibaUzenet,
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
 * === KALIBRÁCIÓ (2026-09-14, fej 2fffd47; minden körben 37 teszt futott le) ===
 *
 * A jóslat FÁJLBAN állt a futtatás előtt
 * (`agents/murena/scripts/joslat-penztar-hiba.md`), a cáfolati feltételekkel.
 *
 *   a vágás mindhárom párra a 4xx-ágat adja   6 piros (páronként 2)
 *   a szállítás és a fizetés mondata egybeesik 1 piros („nincs két egyforma")
 *
 * AZ ELSŐHÖZ 9-ET JÓSOLTAM, ÉS 6 LETT. A jóslatom volt rossz, nem a teszt: a
 * komponens-szeletek az adatréteget mockolják, tehát a `vagas` függvényt el sem
 * érik, a rendelés-mondat ellenőrzős szelete pedig a KONSTANSOKAT méri, nem a
 * leképezést. Amit a jóslat MELLÉ írtam -- hogy a lényeg nem a szám, hanem hogy
 * mindhárom párból pirosodjon -- az teljesült: 2, 2, 2.
 *
 * A MÁSODIK EGY PIROSA NEM HIÁNYOSSÁG: a többi szelet a saját konstansához
 * méri a kimenetet, tehát egy egybeesést KIZÁRÓLAG a halmaz-kontroll fog meg.
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

/**
 * A LEADÁS HIBÁJA A BONTÁS KEDVEZMÉNY-KÓDJÁRA (P4-3c). MI PIROSÍT: ha a kódra
 * nem a teendőt mondó mondat jön; ha minden más hiba is azt kapja.
 */
describe("a leadás hibájának mondata", () => {
  it("a bontás kedvezmény-kódjára a saját mondata, minden másra a mai vágás", () => {
    expect(
      rendelesHibaUzenet(
        new Error("split_discount_changed: the discount changes"),
      ),
    ).toBe(RENDELES_KEDVEZMENY_BONTAS)
    const elutasitas = Object.assign(
      new Error("Some pickup items cannot be collected"),
      { status: 400 },
    )
    expect(rendelesHibaUzenet(elutasitas)).toBe(RENDELES_ELUTASITVA)
    expect(rendelesHibaUzenet(new Error("fetch failed"))).toBe(
      RENDELES_MOST_NEM_SIKERULT,
    )
  })
})

/**
 * A JOGI KAPU MONDATA (kartya f6cb0a51). MI PIROSIT: ha a vevo a kapu
 * elutasitasara a „nezd at a kosarat” mondatot kapna; ha a kod elter a hatter
 * kodjatol (akkor a kapu ugy nez ki, mint egy altalanos elutasitas); ha a
 * fizetes inditasa kimarad a sorbol.
 */
describe("a jogi kapu mondata", () => {
  const kapu = Object.assign(
    new Error("legal_documents_missing: A rendelés jelenleg nem adható le"),
    { status: 400 },
  )

  it("a leadásnál és a fizetés indításánál a saját mondata, nem a kosár átnézése", () => {
    expect(rendelesHibaUzenet(kapu)).toBe(RENDELES_JOGI_HIANY)
    expect(fizetesHibaUzenet(kapu)).toBe(RENDELES_JOGI_HIANY)
    expect(RENDELES_JOGI_HIANY).not.toBe(RENDELES_ELUTASITVA)
  })

  it("más 4xx hibára a mai vágás marad", () => {
    const masik = Object.assign(new Error("Nincs ilyen mód"), { status: 400 })
    expect(fizetesHibaUzenet(masik)).toBe(FIZETES_ELUTASITVA)
    expect(rendelesHibaUzenet(masik)).toBe(RENDELES_ELUTASITVA)
  })

  it("a kód azonos a háttér kódjával", () => {
    const hatter = readFileSync(
      resolve(
        __dirname,
        "../../../../backend/src/workflows/utils/legal-documents.ts",
      ),
      "utf8",
    )
    expect(hatter).toContain(
      `LEGAL_NOT_READY_CODE = "${JOGI_DOKUMENTUM_HIANY_KOD}"`,
    )
  })
})
