import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { hasznaljaVazat } from "./index"

const termek = (gyoker: string) =>
  ({ categories: [{ name: gyoker, mpath: "c1" }] }) as never

/**
 * A KAPU ALLITASAI. Amit itt mérünk, az nem a kinézet, hanem egy HATAR: hogy a
 * váz bekötése NE írja át murena élő állat lapját, amíg ő nem szól.
 */
describe("ki kapja már a vázat", () => {
  it("a műszaki termék IGEN", () => {
    expect(hasznaljaVazat(termek("Termékek"))).toBe(true)
  })

  /**
   * A LÉNYEG, ÉS EZÉRT VAN EGYÁLTALÁN KAPU: az élő állat lapja VÁLTOZATLAN
   * marad. Ez nem ígéret a pull request szövegében, hanem állítás -- ha valaki
   * a kaput feltétel nélkülire cseréli, ez pirosra vált, és a döntés látszik.
   */
  it("az élő állat NEM, mind a három gyökéren", () => {
    expect(hasznaljaVazat(termek("Korallok"))).toBe(false)
    expect(hasznaljaVazat(termek("Halak"))).toBe(false)
    expect(hasznaljaVazat(termek("Gerinctelenek"))).toBe(false)
  })

  /**
   * KATEGÓRIA NÉLKÜL A VÁZAT KAPJA. Ez következik abból, hogy a váltó ilyenkor
   * világosat ad -- és a biztonságos irány: a katalógus túlnyomó része műszaki.
   */
  it("kategória nélküli termék a vázat kapja", () => {
    expect(hasznaljaVazat({ categories: [] } as never)).toBe(true)
    expect(hasznaljaVazat(null)).toBe(true)
  })
})

/**
 * A HASONLO LISTA HELYE, ES AMIT AZ ELNYOMASNAK NEM SZABAD ELNYOMNIA.
 *
 * A `fejlecNelkul` kapcsolo egy KIMENETET nyom el (a starter angol fejlecet).
 * Egy ilyen orzo KET allitast igenyel, es a masodik nem adodik magatol, mert a
 * valtoztatas ELOTT is igaz volt: hogy a rossz esetben ne latszodjon, ES hogy a
 * jo esetben MEGIS latszodjon.
 *
 * A masodik fele az ELO ALLAT lapja: ott a lista tovabbra is a sajat fejlecevel
 * all, mert nincs korulotte cimzett doboz. Ha valaki a kapcsolot "egyszerubb
 * lesz mindenhol" alapon kiterjeszti, ez pirosra valt.
 *
 * MIERT A FORRAST OLVASSA: a `RelatedProducts` aszinkron szerver-komponens,
 * ami adatot hiv le -- jsdomban nem renderelheto. A ket ag KULONBSEGE viszont
 * a sablon forrasaban all, es az olvashato. A halo hatara ezzel kimondva: azt
 * meri, MIT AD AT a sablon, nem azt, mi jelenik meg a kepernyon.
 */
describe("a hasonló lista fejléce ágnként", () => {
  const forras = readFileSync(join(__dirname, "..", "index.tsx"), "utf-8")

  /** ISMERT POZITIV KONTROLL: a fájlt tényleg beolvastuk, és tényleg ez az. */
  it("a sablon forrása olvasható, és mindkét ág renderel hasonló listát", () => {
    expect(forras).toContain("MuszakiLap")
    expect(forras.match(/<RelatedProducts/g)).toHaveLength(2)
  })

  it("a váz ága fejléc nélkül kéri, az élő állat ága a fejléccel", () => {
    const hivasok = forras.split("<RelatedProducts").slice(1)

    expect(hivasok).toHaveLength(2)
    expect(
      hivasok.filter((h) => h.slice(0, 200).includes("fejlecNelkul")),
    ).toHaveLength(1)
  })
})
