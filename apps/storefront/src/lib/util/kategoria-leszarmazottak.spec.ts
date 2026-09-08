import { describe, expect, it } from "vitest"

import {
  leszarmazottAzonositok,
  type KategoriaCsomopont,
} from "./kategoria-leszarmazottak"

/**
 * A FA, AMIN MERUNK -- es a SZERKEZETE a lenyeg, nem a merete.
 *
 * Ket agra van szukseg (`a` es `b`), mert egy egyagu fa NEM tudna
 * megkulonboztetni a helyes viselkedest attol, ha a fuggveny MINDENT
 * visszaadna: ott a ket halmaz egybeesne.
 *
 * Es harom szintre, mert a KOZVETLEN gyerek onmagaban akkor is kijonne, ha a
 * bejaras egyetlen szintet lepne -- az unoka az, ami a MELYSEGET meri.
 */
const FA: KategoriaCsomopont[] = [
  { id: "a", parent_category_id: null },
  { id: "a1", parent_category_id: "a" },
  { id: "a2", parent_category_id: "a" },
  { id: "a1x", parent_category_id: "a1" },
  { id: "b", parent_category_id: null },
  { id: "b1", parent_category_id: "b" },
]

describe("a kategoria leszarmazottai", () => {
  it("a gyoker ONMAGA is benne van", () => {
    expect(leszarmazottAzonositok(FA, "a")).toContain("a")
  })

  it("a kozvetlen gyerekek benne vannak", () => {
    const ki = leszarmazottAzonositok(FA, "a")
    expect(ki).toContain("a1")
    expect(ki).toContain("a2")
  })

  /** A MELYSEG: egy egyszintes bejaras ezt NEM adna vissza. */
  it("az UNOKA is benne van, tehat a bejaras nem all meg egy szinten", () => {
    expect(leszarmazottAzonositok(FA, "a")).toContain("a1x")
  })

  /**
   * A SZUKITES, ES EZ AZ AZ ALLITAS, AMIERT A TOBBI LETEZIK.
   *
   * A fenti harom zold maradna akkor is, ha a fuggveny MINDEN kategoriat
   * visszaadna. Ez az egy mondja meg, hogy a masik ag KIMARAD.
   */
  it("a MASIK ag nem kerul bele", () => {
    const ki = leszarmazottAzonositok(FA, "a")
    expect(ki).not.toContain("b")
    expect(ki).not.toContain("b1")
    expect(ki).toHaveLength(4)
  })

  it("levelre onmagat adja, semmi tobbet", () => {
    expect(leszarmazottAzonositok(FA, "a1x")).toEqual(["a1x"])
  })

  /**
   * ISMERETLEN AZONOSITO: a sajat azonosito akkor is jar, ha a listaban nincs
   * benne. Enelkul egy hianyos kategoria-lista URES szurot adna -- es egy ures
   * `category_id[]` NEM szur, hanem a katalogus elejet adja vissza. A doboz
   * mukodne, csak mast mutatna.
   */
  it("ismeretlen azonositora is onmagat adja, nem ures listat", () => {
    expect(leszarmazottAzonositok(FA, "nincs-ilyen")).toEqual(["nincs-ilyen"])
  })

  /**
   * CIKLUS: nem elmeleti, mert a fa a szerver adatabol jon. Vedelem nelkul ez
   * nem hibauzenet lenne, hanem egy lap, ami sosem tolt be -- es a teszt sem
   * pirosodna, hanem FUTNA, amig valaki le nem allitja.
   */
  it("korbe mutato szulonel megall, es nem ismetel", () => {
    const koros: KategoriaCsomopont[] = [
      { id: "x", parent_category_id: "y" },
      { id: "y", parent_category_id: "x" },
    ]
    const ki = leszarmazottAzonositok(koros, "x")
    expect(ki).toEqual(["x", "y"])
  })

  it("onmagara mutato szulonel sem ismetel", () => {
    const onmaga: KategoriaCsomopont[] = [{ id: "z", parent_category_id: "z" }]
    expect(leszarmazottAzonositok(onmaga, "z")).toEqual(["z"])
  })
})
