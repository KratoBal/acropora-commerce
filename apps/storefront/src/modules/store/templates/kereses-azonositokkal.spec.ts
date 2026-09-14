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
   * A NULLA TALALAT KULON AG, ES EZ A LEGFONTOSABB ALLITAS EBBEN A FAJLBAN.
   *
   * Egy URES `id` halmazt a lekerdezes figyelmen kivul hagyhatna, es akkor a
   * vevo a TELJES katalogust latna egy olyan keresesre, aminek nincs talalata.
   * Nem hibazna, es hihető valasznak latszana -- a nema fajta.
   */
  it("nulla találatnál el sem indítja a lekérdezést", () => {
    expect(kod).toContain("keresesNullaTalalat")
    /* A korai visszateres a lekerdezes ELOTT all: a `listProductsWithSort`
       hivasa kesobb szerepel a fajlban, mint a nulla-talalat aga. */
    expect(kod.indexOf("keresesNullaTalalat) {")).toBeLessThan(
      kod.indexOf("await listProductsWithSort"),
    )
  })

  /**
   * ES A METSZET: ha mar all `id` szuro (kapcsolodo termekek), a ketto
   * EGYUTT ervenyes. Felulirva az egyik feltetel csendben eltunne.
   */
  it("meglévő azonosító-szűrővel metszetet képez, nem ír felül", () => {
    expect(kod).toMatch(/productsIds[\s\S]{0,120}filter\(/)
  })
})
