import { readFileSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A KERESES AZONOSITOKON AT MEGY, NEM A MEDUSA `q` PARAMETEREN.
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * A `paginated-products.tsx` `server-only` adatreteget importal, tehat jsdom
 * alatt be sem tolthető -- amit itt merni lehet, az a FORRAS SZOVEGE. Ez
 * gyengebb allitas egy viselkedes-tesztnel, es ki is mondom.
 *
 * A VISELKEDEST a kiszolgalt lapon mertem, es a kitelepites utan ugyanazzal az
 * eszkozzel merem vissza (`agents/murena/scripts/kereso-ekezet.cjs`), MIND A
 * KET iranyban -- az ekezet nelkuli kereses talaljon, es az EKEZETES is
 * TOVABBRA is talaljon.
 *
 * === A MERT KIINDULO ALLAPOT (2026-09-14, kiszolgalt lap) ===
 *
 *     lehabzó     61-72 talalat        lehabzo     0
 *     világítás   73-84                vilagitas   0
 *     szűrő      241-252               szuro       4
 *     quantum      9  POZITIV KONTROLL     zzzzqqqqxxxx  0  NEGATIV KONTROLL
 */
const kod = (() => {
  const nyers = readFileSync(join(__dirname, "paginated-products.tsx"), "utf8")
  /* A megjegyzeseket kiszedjuk, kulonben a SAJAT magyarazo szovegunk lenne a
     talalat -- a repo mar hasznalja ezt az alakot. */
  return nyers.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")
})()

describe("a keresés azonosítókon át megy", () => {
  /** ISMERT POZITIV KONTROLL: a fajlt tenyleg beolvastuk, es ez a lista. */
  it("a forrás olvasható, és tényleg a terméklista", () => {
    expect(kod).toContain("export default async function PaginatedProducts")
    expect(kod).toContain("listProductsWithSort")
  })

  it("a saját végpontot kérdezi, nem a Medusa szabad szavas keresését", () => {
    expect(kod).toContain("keresesTalalatok")
  })

  /**
   * A `q` PARAMETER MAR NEM MEGY KI. Enelkul a ket ut EGYSZERRE futna: a
   * Medusa a sajat, ekezet-erzekeny feltetelet is rarakna, es a metszet
   * UGYANAZT a nulla talalatot adna vissza, amit javitani akartunk.
   */
  it("a `q` paramétert nem küldi el többé", () => {
    expect(kod).not.toMatch(/queryParams\["q"\]/)
  })

  /**
   * A DONTES A MERT FUGGVENYBOL JON, NEM A LAPON BELULROL.
   *
   * Ez az allitas ELOSZOR a feltetel SZOVEGET merte, es a kalibracio
   * megmutatta, hogy nem discriminal: a `=== 0`-t `=== -1`-re rontva minden
   * szelet zold maradt, mert a valtozo es a korai visszateres a helyen volt.
   * A dontes ezert sajat, merheto fuggvenybe kerult (`kereses-szuro.ts`), es
   * ott VISELKEDESSEL van orizve. Ez a sor csak azt orzi, hogy az ELO ut oda
   * vezessen.
   */
  /**
   * A BEKOTES, ES EZ KULON ALLITAS A KOMPONENS SAJAT TESZTJETOL.
   *
   * A `KeresesCsonkolt` doboza jsdom alatt meg van merve (mikor latszik, mikor
   * nem, honnan jon a szam). Amit AZ nem tud megmerni: hogy a lap tenyleg
   * atadja-e neki a VALASZ mezoit. Ez a szelet arra mer, es a ketto egyutt ad
   * allitast -- egy doboz teszje nem meri a bekotest.
   *
   * A `talalat.csonkolt` es a `talalat.count` NEVE all itt, mert epp az volt a
   * hiba, hogy a mezo letezett es senki nem olvasta.
   */
  it("a csonkolás jelzése a válasz mezőiből kap értéket", () => {
    expect(kod).toContain("talalat.csonkolt")
    expect(kod).toContain("talalat.count")
    expect(kod).toMatch(/<KeresesCsonkolt[^>]*csonkolt=\{keresesCsonkolt\}/)
    expect(kod).toMatch(/<KeresesCsonkolt[^>]*darab=\{keresesDarab\}/)
  })

  it("a nulla-találat döntését a mért függvény hozza", () => {
    expect(kod).toContain("keresesSzuro(")
    expect(kod.indexOf("keresesNullaTalalat")).toBeLessThan(
      kod.indexOf("await listProductsWithSort"),
    )
  })
})
