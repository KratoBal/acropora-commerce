import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import CartLineState, { NotIncrementable } from "./index"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

/**
 * A KOSARSOR HAROM ALLAPOTANAK KIRAJZOLASA.
 *
 * A dontest a `line-state.ts` meri; itt az all, hogy a vevo mit LAT. A ketto
 * kulon hiba lehet, es a masodik csendes: a dontes helyes marad, mikozben a
 * lapon nem latszik semmi.
 */
describe("a kosársor állapotának kirajzolása", () => {
  /**
   * AZ ISMERT POZITIV KONTROLL AZ ELSO ALLITAS: enelkul a "NORMAL semmit nem
   * rajzol" allitas egy olyan dobozon is zold lenne, ami SOHA nem rajzol
   * semmit.
   */
  it("EGYEDI állapotban ott a jelvény és az ígéret-mondat", () => {
    render(<CartLineState state="EGYEDI" similarHref="/store" />)

    expect(screen.getByTestId("cart-line-egyedi")).toHaveTextContent(
      "1 db · Egyedi",
    )
    expect(
      screen.getByText(/A fotón pontosan ezt a példányt látod/),
    ).toBeTruthy()
  })

  it("NORMAL állapotban semmi nem kerül a sorba", () => {
    const { container } = render(
      <CartLineState state="NORMAL" similarHref="/store" />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  /**
   * AZ ELKELT SORBAN KET DOLOG KELL, ES A MASODIK A LENYEG: a vevonek nem elég
   * megtudnia, hogy elkelt -- kapnia kell egy utat tovabb. Es az igeret-mondat
   * NEM allhat ott: az egy megvehető peldanyrol beszelne.
   */
  it("ELKELT állapotban továbbvivő hivatkozás áll, ígéret-mondat nélkül", () => {
    render(<CartLineState state="ELKELT" similarHref="/collections/wysiwyg" />)

    expect(screen.getByTestId("cart-line-elkelt")).toHaveTextContent("Elkelt")
    expect(
      screen.getByRole("link", { name: /Hasonló példányok/ }),
    ).toHaveAttribute("href", "/hu/collections/wysiwyg")
    expect(screen.queryByText(/ez kerül a kosaradba/)).toBeNull()
  })

  it("az egyedi példány mennyisége nem növelhető, és ezt ki is mondja", () => {
    render(<NotIncrementable />)

    expect(screen.getByTestId("cart-line-nem-novelheto")).toHaveTextContent(
      "Nem növelhető",
    )
  })
})

/**
 * A KET CSIP TIPOGRAFIAJA, ES AMIERT CSAK AZ EGYIKRE ALL ALLITAS A TERVBOL.
 *
 * Az EGYEDI csipnek van asztali tervbeli parja (a kosar-terv 1440 pixeles
 * keretében egyetlen csip all, es ez az). Az ELKELT csipnek NINCS: a harom
 * allapotot a terv csak mobil szelessegen rajzolja meg.
 *
 * Ezert az elso ket allitas a TERVET meri, a harmadik viszont csak azt rogziti,
 * hogy az ELKELT csip NEM vette at az egyedi ertekeit -- vagyis nem csusztunk
 * bele egy olyan egysegesitesbe, amit senki nem dontott el.
 *
 * AMIT NEM MER: a festett kepet. A jsdom nem oldja fel a CSS-valtozokat, tehat
 * a token NEVE merheto; a konkret ertek a `terv-tokenek.spec.ts`-ben all.
 */
describe("a kosársor csipjeinek tipográfiája", () => {
  const egyedi = () =>
    screen.getByTestId("cart-line-egyedi").querySelector("span")!

  it("az egyedi csip a mono betűt és a tervbeli méretet viseli", () => {
    render(<CartLineState state="EGYEDI" similarHref="/x" />)

    const cs = egyedi()

    expect(cs.style.fontFamily).toBe("var(--terv-betu-mono-lanc)")
    expect(cs.className).toContain("text-[10.5px]")
    expect(cs.style.letterSpacing).toBe("0.12em")
    expect(cs.className).toContain("font-medium")
  })

  /**
   * A TINTA A REZ SAJAT TOKENJE, NEM AZ ALTALANOS VILAGOS SZOVEG. A ketto kozott
   * alig van kulonbseg (tiszta feher kontra oklch(0.95 0.006 250)), es epp ezert
   * kell allitas: egy visszacsuszas senkinek nem tunne fel.
   */
  it("az egyedi csip tintája a réz saját tokenje", () => {
    render(<CartLineState state="EGYEDI" similarHref="/x" />)

    expect(egyedi().style.color).toBe("var(--terv-kiemel-szoveg)")
    expect(egyedi().style.background).toBe("var(--terv-kiemel)")
  })

  /**
   * AZ ELKELT CSIP NEM VETTE AT AZ EGYEDI ERTEKEIT. Ez nem a terv allitasa,
   * hanem a mienk: amig nincs asztali tervbeli parja, nem egysegesitunk
   * talalgatasbol. Ha valaha atvesszuk, ez pirosodik, es akkor a dontesnek
   * kell melle allnia.
   */
  it("az elkelt csip NEM vette át az egyedi csip betűjét", () => {
    render(<CartLineState state="ELKELT" similarHref="/x" />)

    const cs = screen.getByTestId("cart-line-elkelt").querySelector("span")!

    expect(cs.style.fontFamily).toBe("")
    expect(cs.style.color).toBe("var(--terv-szoveg-vilagos)")
  })
})

/**
 * A SZERIF AZ ASZTALI NEZETBEN -- KET ALLITAS, ES A MASODIK A KONTROLL.
 *
 * A terv a kosar 3a lapjan ezt a mondatot KETSZER rajzolja: a 390-es mobil
 * kereten belul orokolt betuvel, az 1440-es asztalin Newsreaderrel. A
 * `small:` (1024) toresponthoz kotott jeloles ezt a ket allapotot adja
 * vissza, es ugyanott valt, ahol a kosar racsa ketoszloposra all.
 *
 * A MASODIK ALLITAS NEM DISZ: enelkul egy valtozas, ami a szerifet a KOMPONENS
 * MINDEN szovegere raviszi, ugyanugy zold maradna -- es akkor a jeloles nem
 * jelolne semmit. A csip a szomszedja, es sajat betuje van (mono), tehat pont
 * az, aminek NEM szabad megkapnia.
 *
 * AMIT NEM MER: hogy a bongeszo mit fest. A jsdom nem forditja le a Tailwind
 * osztalyokat, es a toresponthoz kotott alakot vegkepp nem ertelmezi -- ez a
 * jeloles MEGLETET meri, nem a kirajzolt betut.
 */
describe("a szerif az asztali nézetben", () => {
  it("az egyedi példány ígérete a törésponttól szerifet visel", () => {
    render(<CartLineState state="EGYEDI" similarHref="/x" />)

    expect(screen.getByTestId("egyedi-kosar-igeret").className).toContain(
      "small:font-kiemelt",
    )
  })

  it("a csip NEM kapta meg a szerifet", () => {
    render(<CartLineState state="EGYEDI" similarHref="/x" />)

    const cs = screen.getByTestId("cart-line-egyedi").querySelector("span")!

    expect(cs.className).not.toContain("font-kiemelt")
  })
})
