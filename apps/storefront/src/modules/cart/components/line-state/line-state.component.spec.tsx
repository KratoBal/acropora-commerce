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
    render(
      <CartLineState countryCode="hu" state="EGYEDI" similarHref="/store" />,
    )

    expect(screen.getByTestId("cart-line-egyedi")).toHaveTextContent(
      "1 db · Egyedi",
    )
    expect(
      screen.getByText(/A fotón pontosan ezt a példányt látod/),
    ).toBeTruthy()
  })

  it("NORMAL állapotban semmi nem kerül a sorba", () => {
    const { container } = render(
      <CartLineState countryCode="hu" state="NORMAL" similarHref="/store" />,
    )

    expect(container).toBeEmptyDOMElement()
  })

  /**
   * AZ ELKELT SORBAN KET DOLOG KELL, ES A MASODIK A LENYEG: a vevonek nem elég
   * megtudnia, hogy elkelt -- kapnia kell egy utat tovabb. Es az igeret-mondat
   * NEM allhat ott: az egy megvehető peldanyrol beszelne.
   */
  it("ELKELT állapotban továbbvivő hivatkozás áll, ígéret-mondat nélkül", () => {
    render(
      <CartLineState
        countryCode="hu"
        state="ELKELT"
        similarHref="/collections/wysiwyg"
      />,
    )

    expect(screen.getByTestId("cart-line-elkelt")).toHaveTextContent("Elkelt")
    expect(
      screen.getByRole("link", { name: /Hasonló példányok/ }),
    ).toHaveAttribute("href", "/hu/collections/wysiwyg")
    expect(screen.queryByText(/ez kerül a kosaradba/)).toBeNull()
  })

  it("az egyedi példány mennyisége nem növelhető, és ezt ki is mondja", () => {
    render(<NotIncrementable countryCode="hu" />)

    expect(screen.getByTestId("cart-line-nem-novelheto")).toHaveTextContent(
      "Nem növelhető",
    )
  })
})

/**
 * A CSIPEK ES A LINK A CSALAD TOKENJEIT VISELIK, OSZTALYBOL.
 *
 * A regi terv az egyedi csipet mono betuvel, rez tokenekkel (`--terv-kiemel`)
 * szedte, inline stilusban. A kosar a kezdolap, a terméklap es a kategorialap
 * csaladjahoz igazodott (Balazs 2026-11-01 17:12, acrobot 39610-39612): a csip
 * a kategoria kartyajanak jelvenyeivel azonos felepitesu, `acr-` tokenekkel.
 * A DONTES TEHAT KIMONDOTT, a regi mono/rez meres ezzel cserelodott le.
 *
 * AMIT NEM MER: a festett kepet. A jsdom nem forditja le a Tailwind
 * osztalyokat, ezert a token NEVE merheto, a konkret ertek az
 * `acropora-tokens.css`-ben all.
 */
describe("a kosársor csipjei a család tokenjeit viselik", () => {
  /** A csip a SAJAT azonositojan at, nem `querySelector("span")`-nal. */
  const egyedi = () => screen.getByTestId("cart-line-egyedi-csip")

  it("az egyedi csip a narancs felületet és a fehér tintát viseli, inline stílus nélkül", () => {
    render(<CartLineState countryCode="hu" state="EGYEDI" similarHref="/x" />)

    const cs = egyedi()

    expect(cs.className).toContain("bg-acr-heritage")
    expect(cs.className).toContain("text-acr-white")
    expect(cs.className).toContain("text-[10px]")
    expect(cs.getAttribute("style")).toBeNull()
  })

  it("a hasonló termékek linkje az óceán tokent viseli", () => {
    render(<CartLineState countryCode="hu" state="ELKELT" similarHref="/x" />)

    const link = screen.getByTestId("cart-line-hasonlo-link")
    expect(link.className).toContain("text-acr-ocean")
    expect(link.getAttribute("style")).toBeNull()
  })

  /**
   * AZ ELKELT CSIP NEM VETTE AT AZ EGYEDI FELULETET: sotet (`acr-ink`), mert
   * nem megvehető, es nem szabad ugy nezni ki, mint a megvehető egyedi darab.
   */
  it("az elkelt csip a sötét felületet viseli, nem a narancsot", () => {
    render(<CartLineState countryCode="hu" state="ELKELT" similarHref="/x" />)

    const cs = screen.getByTestId("cart-line-elkelt-csip")

    expect(cs.className).toContain("bg-acr-ink")
    expect(cs.className).not.toContain("bg-acr-heritage")
  })
})

/**
 * AZ IGERET-MONDAT SANS BETUVEL ALL, NEM SZERIFFEL (lasd a `pickup-notice`
 * parjat: a kosar a csalad betujehez igazodott). A ket allitas egyutt
 * kulonboztet: se feltetel nelkul, se torespontnal nem all rajta szerif, es a
 * csipen sem.
 */
describe("az ígéret-mondat sans betűvel áll", () => {
  it("az egyedi példány ígérete nem visel szerifet", () => {
    render(<CartLineState countryCode="hu" state="EGYEDI" similarHref="/x" />)

    const igeret = screen.getByTestId("egyedi-kosar-igeret")

    expect(igeret.className).not.toContain("font-kiemelt")
    expect(igeret.className).not.toContain("small:font-kiemelt")
  })

  it("a csip sem kapta meg a szerifet", () => {
    render(<CartLineState countryCode="hu" state="EGYEDI" similarHref="/x" />)

    expect(screen.getByTestId("cart-line-egyedi-csip").className).not.toContain(
      "font-kiemelt",
    )
  })
})
