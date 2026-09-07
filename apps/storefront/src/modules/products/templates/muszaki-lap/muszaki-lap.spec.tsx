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
