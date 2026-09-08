import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import { ElerhetosegDoboz } from "./dobozok"

afterEach(cleanup)

/**
 * AZ ELERHETOSEG-DOBOZ, ES AMIERT EPP EZ AZ EGY A NEGYBOL.
 *
 * A masik harom doboz (ar, valaszto, mennyiseg) a vasarlasi KONTEXTUSBOL olvas,
 * es provider nelkul `null`-t ad -- azokat a megepitett lapon kell merni. Ez a
 * doboz TISZTA MEGJELENITES: ket tenyt kap parameterben, es a sajat fejlece
 * mondja ki, miert nem kontextusbol veszi oket. Ezert merheto itt, egyedul.
 *
 * MIERT KERULT IDE MOST: a doboz alakjat egyetlen allitas sem merte. Ugyanaz a
 * csend, ami a panel hattereen is allt: a `Kiszerelés: X` sor barmikor
 * elmozdulhatott volna, es semmi nem szolt volna.
 *
 * AMIT MER: a melyedes tokenjet es a sorok ALAKJAT (cimke-ertek par kontra
 * teljes szelessegu mondat). AMIT NEM: a festett szint -- a jsdom nem oldja fel
 * a CSS-valtozokat, tehat itt a token NEVE merheto, az ERTEKE a
 * `terv-tokenek.spec.ts`-ben all.
 */
/**
 * A DOBOZ MERT GEOMETRIAJA -- ES AMIERT KULON ALL A TOKEN-ALLITASOKTOL.
 *
 * A meresek forrasa a terv 2a lapja, a
 * `vasarlasi-panel-belso-elrendezes-2026-09-08.md` leletben tetelesen:
 * `padding:14px`, `gap:6px`, es a sorok `13.5px`-en allnak.
 *
 * MIERT KELLETT: mind a harom ertek benne allt a kodban, es EGYETLEN allitas
 * sem merte oket. A `13.5px` ugyan szerepelt egy spec fajlban, de a KOSAR
 * atveteli savjaera -- mas komponens, mas doboz. Egy ilyen talalat ugy nez ki,
 * mint lefedettseg, es nem az: a kereses a fajlra megy, nem az elemre.
 *
 * AMIT NEM MER: a kirajzolt meretet. A jsdom nem forditja le a Tailwind
 * osztalyokat, tehat ez a JELOLES meglete, nem a festett pixel.
 */
describe("az elérhetőség-doboz mért geometriája", () => {
  it("a mélyedés belső margója 14, a sorköze 6 pixel", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" />)

    const melyedes = screen.getByTestId("elerhetoseg-melyedes")

    expect(melyedes.className).toContain("p-[14px]")
    expect(melyedes.className).toContain("gap-[6px]")
  })

  /**
   * MIND A HAROM SORT KULON MERJUK, mert kulon elemek es kulon is
   * elmozdulhatnak. Egy ciklus egyetlen allitasban ugyanezt merne, de a piros
   * nem mondana meg, MELYIK sor csuszott el -- es a kalibraciobol tudjuk, hogy
   * a piros NEVE a bizonyitek, nem a szama.
   */
  it("a rendelési mondat 13.5 pixelen áll", () => {
    render(<ElerhetosegDoboz rendelesiMondat="Legalább 2 darab rendelhető." />)

    expect(screen.getByTestId("vaz-rendelesi-mondat").className).toContain(
      "text-[13.5px]",
    )
  })

  it("a készlet-sor 13.5 pixelen áll", () => {
    render(<ElerhetosegDoboz keszlet={3} />)

    expect(screen.getByTestId("vaz-keszlet").className).toContain(
      "text-[13.5px]",
    )
  })

  it("a kiszerelés-sor 13.5 pixelen áll", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" />)

    expect(screen.getByTestId("vaz-egyseg").className).toContain(
      "text-[13.5px]",
    )
  })
})

describe("az elérhetőség-doboz mélyedése", () => {
  it("a mélyedés a lap tokenjét viseli, nem a panelét", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" />)

    expect(screen.getByTestId("elerhetoseg-melyedes").style.background).toBe(
      "var(--terv-hatter)",
    )
  })

  /**
   * A KISZERELES CIMKE-ERTEK PAR, A TERV SZERINT. A regi alak EGY mondat volt
   * (`Kiszerelés: 1 db`), a tervben viszont a cimke balra, az ertek jobbra all.
   * Ezert a KET RESZT kulon allitjuk, nem a teljes szoveget: egy osszefuzott
   * szoveg akkor is egyezne, ha a ket resz egy elembe kerulne vissza.
   */
  it("a kiszerelés címke és érték, két külön részben", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" />)

    const sor = screen.getByTestId("vaz-egyseg")
    const reszek = Array.from(sor.querySelectorAll("span"))

    expect(reszek).toHaveLength(2)
    expect(reszek[0].textContent).toBe("Kiszerelés")
    expect(reszek[1].textContent).toBe("1 db")
    expect(reszek[0].style.color).toBe("var(--terv-szoveg-halvany)")
    expect(sor.className).toContain("justify-between")
  })

  /**
   * A RENDELESI MONDAT NEM PAR, ES EZ KULON ALLITAS. Ha valaki egyszer
   * "egysegesitene" a ket sort, ez pirosodik -- es az a helyes, mert a
   * mondathoz cimket kellene KITALALNI.
   */
  it("a rendelési mondat egyben áll, cimke nélkül", () => {
    render(<ElerhetosegDoboz rendelesiMondat="Legalább 2 darab rendelhető." />)

    const p = screen.getByTestId("vaz-rendelesi-mondat")

    expect(p.querySelectorAll("span")).toHaveLength(0)
    expect(p.textContent).toBe("Legalább 2 darab rendelhető.")
  })

  /**
   * ISMERT POZITIV KONTROLL A HIANY-AGRA. Enelkul a fenti harom allitas nem
   * mondana meg, hogy a doboz a PARAMETEREKTOL fugg -- csak azt, hogy amikor
   * megjelenik, jol nez ki.
   */
  it("adat nélkül semmit nem rajzol", () => {
    const { container } = render(<ElerhetosegDoboz />)

    expect(container.firstChild).toBeNull()
  })

  it("a két adat egymás mellett is megáll", () => {
    render(
      <ElerhetosegDoboz
        kiszereles="1 db"
        rendelesiMondat="Legalább 2 darab."
      />,
    )

    const melyedes = screen.getByTestId("elerhetoseg-melyedes")
    expect(melyedes.querySelector('[data-testid="vaz-egyseg"]')).toBeTruthy()
    expect(
      melyedes.querySelector('[data-testid="vaz-rendelesi-mondat"]'),
    ).toBeTruthy()
  })
})

/**
 * A SZUKOSSEG-SOR KIRAJZOLASA -- ES EZ MASIK ALLITAS, MINT A DONTES.
 *
 * A `scarcityCountOf` allitasai azt merik, MIKOR van szam. Ezek azt, hogy a
 * szambol lesz-e SOR a lapon. A ketto fuggetlenul romolhat el: a dontes
 * maradhat helyes ugy, hogy a doboz nem rajzolja ki -- es akkor a fuggveny
 * harom zold allitasa semmit nem er a vevo szempontjabol.
 *
 * (Ezt a kalibracio mondta meg: a JSX ag torlese ELOSZOR egyetlen allitast sem
 * suttetett el.)
 */
describe("a szűkösség-sor a dobozban", () => {
  it("egy darabnál kiírja, hogy ez az utolsó", () => {
    render(<ElerhetosegDoboz keszlet={1} />)

    const sor = screen.getByTestId("vaz-keszlet")
    const reszek = Array.from(sor.querySelectorAll("span"))

    expect(reszek).toHaveLength(2)
    expect(reszek[0].textContent).toBe("Készlet")
    expect(reszek[1].textContent).toBe("1 db · utolsó")
  })

  /** Tobb darabnal nincs "utolso": az allitas a SZAMBOL kovetkezik, nem a sorbol. */
  it("több darabnál csak a darabszám áll ott", () => {
    render(<ElerhetosegDoboz keszlet={3} />)

    expect(
      Array.from(screen.getByTestId("vaz-keszlet").querySelectorAll("span"))[1]
        .textContent,
    ).toBe("3 db")
  })

  /**
   * A TAGADO ESET, es mellette all a fenti KET pozitiv -- azok bizonyitjak,
   * hogy a kereses meg tudja talalni a sort, amikor OTT VAN.
   */
  it("szám nélkül nincs sor", () => {
    render(<ElerhetosegDoboz kiszereles="1 db" keszlet={null} />)

    expect(screen.queryByTestId("vaz-keszlet")).toBeNull()
  })
})
