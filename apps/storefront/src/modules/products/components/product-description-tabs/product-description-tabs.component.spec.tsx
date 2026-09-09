import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import ProductDescriptionTabs from "./index"

afterEach(cleanup)

const TABLAZAT =
  "<table><tbody><tr><td>Teljesítmény</td><td>160 W</td></tr></tbody></table>"
const PROZA = "<p>Az <strong>Aqualight</strong> lámpa leírása.</p>"

/**
 * A FUL-SAVNAK EDDIG EGYETLEN ALLITASA SEM VOLT.
 *
 * A komponens a lap egyik legtobbet hasznalt resze (a leiras es a belole
 * kihamozott tablazat), es 2026-09-09-ig NEM allt mellette spec fajl. A
 * sorrend-valtas ezert nem csak egy sort visz be, hanem a meresi helyet is
 * megnyitja.
 */
describe("a termékleírás fül-sávja", () => {
  /**
   * A FUL ASZTALI FELIRATA -- ES MIERT NEM A PUSZTA `textContent`.
   *
   * 2026-09-09 ota egy ful KET feliratot hordozhat: a rovidet telefonra
   * (`lg:hidden`) es a teljeset asztalira (`hidden lg:inline`). A
   * `textContent` MIND A KETTOT visszaadja egymas utan
   * ("AdatokMűszaki adatok"), mert a jsdom nem szamol stilust -- es elo
   * bongeszoben is igy van, ott az `innerText` a lathatot mero eszkoz.
   *
   * Ez a segedfuggveny ezert az ASZTALI feliratot olvassa ki nevesitve. Az
   * elso valtozat a `textContent`-et hasznalta, es pontosan akkor ment
   * pirosra, amikor a kod JOBB LETT (ket felirat egy helyett) -- nem a
   * fajlnevet igazitottam hozza, hanem a mérőhelyet emeltem a jobb szintre.
   */
  const asztaliCimke = (e: Element) =>
    (e.querySelector(".lg\\:inline")?.textContent ?? e.textContent ?? "").trim()

  const fulNevek = () =>
    Array.from(document.querySelectorAll('[role="tab"]')).map(asztaliCimke)

  /**
   * AZ ADAT-FUL ALL ELOL. A tervlap NEGY kereteben all ful-sav, es mind a
   * negyben a "Leírás" a MASODIK elem.
   */
  it("az adat-fül áll elöl, a leírás második", () => {
    render(<ProductDescriptionTabs description={PROZA + TABLAZAT} />)

    expect(fulNevek()).toEqual(["Műszaki adatok", "Leírás"])
  })

  /**
   * TELEFONON AZ ADAT-FUL FELIRATA ROVIDEBB: "Adatok".
   *
   * A tervlap mobil kerete a cimket NEM csak rovidíti, hanem AT IS NEVEZI
   * ("Műszaki adatok" -> "Adatok"). A "Leírás" mindket kereten ugyanaz, tehat
   * ott nincs masodik felirat -- es ezt a harmadik allitas mondja ki.
   *
   * A jsdom nem szamol stilust, tehat itt a JELOLEST merjuk: melyik felirat
   * melyik torespont-osztalyt viseli. A latvanyt elo bongeszoben kell merni.
   */
  it("telefonon az adat-fül felirata Adatok", () => {
    render(<ProductDescriptionTabs description={PROZA + TABLAZAT} />)

    const rovid = document
      .querySelectorAll('[role="tab"]')[0]
      .querySelector(".lg\\:hidden")

    expect(rovid?.textContent?.trim()).toBe("Adatok")
  })

  it("asztalin a teljes felirat áll ott", () => {
    render(<ProductDescriptionTabs description={PROZA + TABLAZAT} />)

    const teljes = document
      .querySelectorAll('[role="tab"]')[0]
      .querySelector(".lg\\:inline")

    expect(teljes?.textContent?.trim()).toBe("Műszaki adatok")
    expect(teljes?.className).toContain("hidden")
  })

  /**
   * ES A LEIRAS FULNEK NINCS MASODIK FELIRATA.
   *
   * A terv mind a ket kereten ugyanazt adja. Egy `rovidCimke: "Leírás"` sor
   * azt sugallna, hogy van kulonbseg -- es a kovetkezo olvaso keresne, mi az.
   */
  it("a leírás fülnek nincs külön mobil felirata", () => {
    render(<ProductDescriptionTabs description={PROZA + TABLAZAT} />)

    const leiras = document.querySelectorAll('[role="tab"]')[1]

    expect(leiras.querySelector(".lg\\:hidden")).toBeNull()
    expect(leiras.textContent?.trim()).toBe("Leírás")
  })

  /**
   * ES AZ ADAT-FUL AZ AKTIV INDULASKOR -- KULON ERTEK.
   *
   * A sorrend es a kezdo allapot ket kulon dolog: egy olyan valtozat is
   * atmenne a fenti allitason, ami a masodik fulet nyitja meg elsonek. A
   * terven a ful-sav ALATT a tablazatos adat all kirajzolva, nem a proza.
   */
  it("induláskor az adat-fül az aktív", () => {
    render(<ProductDescriptionTabs description={PROZA + TABLAZAT} />)

    const fulek = document.querySelectorAll('[role="tab"]')

    expect(fulek[0].getAttribute("aria-selected")).toBe("true")
    expect(fulek[1].getAttribute("aria-selected")).toBe("false")
    expect(screen.getByRole("tabpanel").textContent).toContain("160 W")
  })

  /**
   * ES A VALTAS MUKODIK: a kattintas a PANEL TARTALMAT csereli, nem csak a
   * kijelolest. Egy `aria-selected`-et allito, de panelt nem cserelo valtozat
   * ugyanugy atmenne egy kijelolest mero allitason.
   */
  it("a leírás fülre kattintva a panel tartalma vált", () => {
    render(<ProductDescriptionTabs description={PROZA + TABLAZAT} />)

    /* ISMERT POZITIV KONTROLL: indulaskor a tablazat all a panelben. */
    expect(screen.getByRole("tabpanel").textContent).toContain("160 W")

    fireEvent.click(document.querySelectorAll('[role="tab"]')[1])

    expect(screen.getByRole("tabpanel").textContent).toContain("Aqualight")
    expect(screen.getByRole("tabpanel").textContent).not.toContain("160 W")
  })

  /**
   * EGYETLEN TARTALOMNAL NINCS SAV -- es ez ket kulon eset, mert a ket ag
   * MAS mezobol jon. A tablazat nelkuli termek a gyakoribb; a proza nelkuli
   * ritka, de letezik (csak tablazatot tartalmazo leiras).
   */
  it("csak prózánál nincs fül-sáv, a szöveg magában áll", () => {
    render(<ProductDescriptionTabs description={PROZA} />)

    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(0)
    expect(screen.getByTestId("product-description").textContent).toContain(
      "Aqualight",
    )
  })

  it("csak táblázatnál sincs fül-sáv", () => {
    render(<ProductDescriptionTabs description={TABLAZAT} />)

    expect(document.querySelectorAll('[role="tab"]')).toHaveLength(0)
    expect(screen.getByTestId("product-description").textContent).toContain(
      "160 W",
    )
  })

  it("üres leírásnál semmit nem rajzol", () => {
    const { container } = render(<ProductDescriptionTabs description="" />)

    expect(container.innerHTML).toBe("")
  })
})
