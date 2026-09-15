import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { KeresesCsonkolt } from "./index"

afterEach(cleanup)

/**
 * A CSONKOLAS LATHATO-E, ES A SZAM A VALASZBOL JON-E.
 *
 * === A MERT HIBA ===
 *
 * A vegpont 200 azonositonal levagja a listat, es a valaszban KIMONDJA
 * (`csonkolt`). A kirakatban viszont senki nem olvasta: a mezo a tipusban allt
 * es harom helyen visszaterult, de egyetlen komponens sem hivatkozott ra
 * (merve az origin/main-en, bca990c). A kitelepitett vegponton a `szuro`
 * kereses 200 talalatot es `csonkolt=true`-t ad, tehat a vevo 200 terméket
 * latott ugy, hogy semmi nem szolt a tobbirol.
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * MERI: mikor latszik a mondat, mikor NEM, es hogy a szam az atadott ertekbol
 * jon-e (nem beegetett 200).
 *
 * NEM MERI a BEKOTEST -- hogy a lap tenyleg atadja a valasz mezoit. Az a
 * `paginated-products.tsx`, ami `server-only` adatreteget importal, tehat
 * jsdom alatt be sem tolthető; arra a szomszedos spec mer a forras szovegere.
 * A ketto EGYUTT ad allitast, kulon egyik sem: egy doboz teszje nem meri a
 * bekotest.
 *
 * === KALIBRACIO (2026-09-14, fej 26eed33; minden korben 27 teszt futott le) ===
 *
 * A joslat FAJLBAN allt a futtatas elott
 * (`agents/murena/scripts/joslat-csonkolt.md`), a cafolati feltetelekkel.
 *
 *   mindig kirajzolja (a feltetel kiesik)   1 piros („csonkolas nelkul NEM")
 *   soha nem rajzolja ki                    4 piros (a masik negy szelet)
 *   a szam BEEGETVE 200                     1 piros („az atadott ertekbol jon")
 *
 * A HARMADIKNAL A KONTROLL ZOLD MARADT, es ez szandekos: 200-at egetek be,
 * tehat az „egy masik szam is atmegy" szelet (ami 200-zal hiv) tovabbra is
 * teljesul. Ez mutatja, hogy a ket szelet KULON mer -- ha egyutt pirosodnanak,
 * nem tudnank, melyik allitas el.
 *
 * A BEKOTES ket rontasat a SZOMSZEDOS spec fogja (`kereses-azonositokkal`), es
 * ott derult ki, hogy az elso alakja HALOTT volt. Lasd ott.
 */
describe("a csonkolas jelzese", () => {
  it("csonkolaskor megjelenik a mondat", () => {
    render(<KeresesCsonkolt csonkolt darab={200} />)

    expect(screen.getByTestId("kereses-csonkolt")).toBeTruthy()
  })

  /**
   * A MASIK IRANY, ES EZ A FONTOSABB FELE: ha NINCS csonkolas, a mondat NEM
   * jelenhet meg. Egy jelzes, ami mindig ott all, ugyanannyit er, mint ami
   * sosem -- es ez utobbi meg ijesztget is a teljes talalati listan.
   */
  it("csonkolas nelkul NEM jelenik meg semmi", () => {
    const { container } = render(
      <KeresesCsonkolt csonkolt={false} darab={12} />,
    )

    expect(screen.queryByTestId("kereses-csonkolt")).toBeNull()
    expect(container.textContent).toBe("")
  })

  /**
   * A SZAM AZ ATADOTT ERTEKBOL JON, NEM BEEGETVE. A felso hatar a backenden
   * all (`FELSO_HATAR`); ha ide is beirnank 200-at, a szam attol a naptol
   * hazudna, amikor amazt atallitjak -- es a lap ettol meg megjelenne, tehat
   * semmi nem szolna.
   */
  it("a szam az atadott ertekbol jon", () => {
    render(<KeresesCsonkolt csonkolt darab={50} />)

    const szoveg = screen.getByTestId("kereses-csonkolt").textContent ?? ""
    expect(szoveg).toContain("50")
    expect(szoveg).not.toContain("200")
  })

  /**
   * ISMERT POZITIV KONTROLL A FENTIHEZ: egy MASIK ertek is atmegy. Enelkul a
   * fenti szeletet egy olyan valtozat is kielegitene, ami veletlenul epp
   * 50-et ir ki mindig.
   */
  it("egy masik szam is atmegy", () => {
    render(<KeresesCsonkolt csonkolt darab={200} />)

    expect(screen.getByTestId("kereses-csonkolt").textContent ?? "").toContain(
      "200",
    )
  })

  /**
   * A MONDAT KIMONDJA A VAGAS ISMERVET.
   *
   * A vegpont a vagas ELOTT `created_at DESC` szerint rendez, tehat a
   * megtartott darab MINDIG a legujabb -- fuggetlenul attol, hogyan rendez a
   * vevo a lapon. Ha a vevo AR szerint rendez, a 200 LEGUJABB talalat
   * legolcsobbjait latja, nem a kereses legolcsobb termekeit. Egy „az elso
   * 200" alaku mondat ezt elfedne.
   */
  it("megmondja, hogy a legujabbakat tartotta meg", () => {
    render(<KeresesCsonkolt csonkolt darab={200} />)

    expect(screen.getByTestId("kereses-csonkolt").textContent ?? "").toContain(
      "legújabb",
    )
  })

  /** MAGYARUL, ekezetesen, mert a vevo latja. */
  it("a mondat magyar es ekezetes", () => {
    render(<KeresesCsonkolt csonkolt darab={200} />)

    const szoveg = screen.getByTestId("kereses-csonkolt").textContent ?? ""
    expect(szoveg).toMatch(/[áéíóöőúüű]/)
    expect(szoveg).toMatch(/Pontosítsd/)
  })
})
