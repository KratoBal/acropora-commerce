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

/**
 * A SZINEK A TERV TOKENJEIROL JONNEK, NEM NYERS MEDUSA-OSZTALYOKROL.
 *
 * === MIERT ALLITAS, ES NEM CSAK EGY CSERE ===
 *
 * Az `ui-fg-interactive` osztaly rgb(59,130,246) -- Tailwind blue-500 --, es a
 * paletankban SEHOL nem szerepel. Egy idegen szin egy MUKODO komponensen nem
 * latszik hibanak: a ful mukodik, a fokusz-gyuru megjelenik, semmi nem hasal
 * el. Epp ezert maradna ott hataridotlenul, ha nem all rá allitas.
 *
 * A jsdom nem szamol szint (a `var()` feloldasa a bongeszoben tortenik), tehat
 * az OSZTALYT allitjuk, nem a kirajzolt erteket. Ezt kimondom, mert egy
 * "a szin helyes" alaku allitas itt nem lenne igaz -- csak az, hogy a helyes
 * TOKENRE hivatkozunk.
 */
describe("a fülek színei a terv tokenjein állnak", () => {
  /* Ugyanaz a bemenet, amit a fenti szakaszok is hasznalnak: a leiras egy
     TABLAZATOT es egy PROZA-reszt tartalmaz, tehat KET ful all elo. */
  const KET_FULES = TABLAZAT + PROZA

  it("egyetlen nyers Medusa szin-osztaly sem marad a sávban", () => {
    const { container } = render(
      <ProductDescriptionTabs description={KET_FULES} />,
    )

    const jeloles = container.innerHTML

    for (const osztaly of [
      "ui-fg-interactive",
      "ui-fg-base",
      "ui-fg-muted",
      "ui-fg-subtle",
      "ui-border-base",
    ]) {
      expect(jeloles).not.toContain(osztaly)
    }
  })

  /**
   * ISMERT POZITIV KONTROLL. A fenti tagadast egy URES komponens is
   * kielegitene. Ez mutatja meg, hogy a helyere a TERV tokenjei kerultek.
   */
  it("a helyükön a terv tokenjei állnak", () => {
    const { container } = render(
      <ProductDescriptionTabs description={KET_FULES} />,
    )

    const jeloles = container.innerHTML

    expect(jeloles).toContain("var(--terv-keret)")
    expect(jeloles).toContain("var(--terv-szoveg)")
    expect(jeloles).toContain("var(--terv-szoveg-halvany)")
    expect(jeloles).toContain("var(--terv-kiemel)")
  })

  /**
   * A LEGFONTOSABB EGY SOR: az AKTIV ful alavonasa a lap SAJAT szovegszine, nem
   * kek akcens. Ez az egyetlen azonnal eszrevehato valtozas a lapon.
   */
  it("az aktív fül aláhúzása a lap szövegszínén áll", () => {
    render(<ProductDescriptionTabs description={KET_FULES} />)

    const aktiv = screen
      .getAllByRole("tab")
      .find((e) => e.getAttribute("aria-selected") === "true")

    expect(aktiv).toBeTruthy()
    expect(aktiv?.className).toContain("border-[var(--terv-szoveg)]")
    /*
      A TAGADAS A `border-` ELOTAGGAL EGYUTT SZOL, ES EZ MERT DONTES.

      Az elso alakom `not.toContain("ui-fg-interactive")` volt, es az a
      FOKUSZ-GYURU osztalyara is illeszkedett (`focus-visible:outline-...`),
      ami UGYANAZON a gombon all. A kalibracioban ki is derult: a fokusz-gyuru
      rontasa ezt az allitast is pirosra vitte, holott a NEVE az alavonasrol
      szol.

      Egy allitas, ami tobbet fog meg, mint amit a neve mond, kesobb rossz
      helyre kuldi az olvasot.
    */
    expect(aktiv?.className).not.toContain("border-ui-fg-interactive")
  })
})
