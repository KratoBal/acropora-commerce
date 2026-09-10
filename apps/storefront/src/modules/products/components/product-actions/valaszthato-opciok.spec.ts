import { describe, expect, it } from "vitest"

import { vanValaszthatoOpcio } from "./valaszthato-opciok"

const csoport = (...ertekek: string[]) => ({
  values: ertekek.map((value) => ({ value })),
})

/**
 * A MAI KATALOGUS ES A HOLNAPI ESET, EGYUTT.
 *
 * A mai adaton MINDEN termek egy csoportos es egy ertekes (1492/1492, merve
 * 2026-09-10). Ezert a "nincs mibol valasztani" ag az, ami ma mindenhol fut --
 * es epp ezert nem eleg csak azt merni: egy fuggveny, ami MINDIG hamisat ad,
 * ugyanezt a zoldet adna. A ket ertekes eset teszi merhetove a kulonbseget.
 */
describe("van-e mibol valasztani", () => {
  it("egy csoport egy ertekkel: nincs", () => {
    expect(vanValaszthatoOpcio({ options: [csoport("Alap")] })).toBe(false)
  })

  it("egy csoport ket ertekkel: van", () => {
    expect(vanValaszthatoOpcio({ options: [csoport("160 W", "240 W")] })).toBe(
      true,
    )
  })

  /**
   * A KEVERT ESET, ES EZ A LEGKOZELEBBI TEVESZTES: ket csoport, amibol csak a
   * MASODIK valaszthato. Egy megvalositas, ami csak az ELSO csoportot nezi,
   * atmenne a fenti ket allitason, es itt bukik el.
   */
  it("ket csoport, csak a masodik valaszthato: van", () => {
    expect(
      vanValaszthatoOpcio({
        options: [csoport("Alap"), csoport("Piros", "Kek")],
      }),
    ).toBe(true)
  })

  it("nulla csoport: nincs", () => {
    expect(vanValaszthatoOpcio({ options: [] })).toBe(false)
  })

  /**
   * A HIANYZO ADAT NEM UGYANAZ, MINT AZ URES: a lap a termeket a `*options`
   * mezo KERESE nelkul is le tudja kerni, es akkor az `options` nem ures tomb,
   * hanem nincs ott. A fuggveny ilyenkor sem dobhat -- a hiany "nincs mibol
   * valasztani", nem hiba.
   */
  it("hianyzo options mezo: nincs, es nem dob", () => {
    expect(vanValaszthatoOpcio({})).toBe(false)
    expect(vanValaszthatoOpcio(null)).toBe(false)
    expect(vanValaszthatoOpcio(undefined)).toBe(false)
  })
})
