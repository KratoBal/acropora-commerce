import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "en-hu" }),
}))
vi.mock("@lib/data/hirlevel", () => ({ hirlevelFeliratkozasAkcio: vi.fn() }))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"
import { lablecAdat } from "./lablec-adat"
import { LablecKeret } from "./lablec-keret"

/**
 * AZ ANGOL LABLEC (kirakat-i18n-fejlec-lablec). MI PIROSIT: ha az angol lablec magyar felirattal marad (a beepitett oszlopok,
 * a jogi linkek, az also sor, a hirlevel, a fizetesi opciok kepe); ha az OS-ben mentett magyar kezdoertek (a szerkeszto visszairja
 * oket) nem fordul; ha egy KEZZEL atirt felirat is fordul (azt valaki irta); ha a magyar lablec barmiben mas lesz.
 *
 * AMI MAGYAR MARAD: a bolt adatai (cim, nyitvatartas, telefon) es amit az OS-ben valaki irt. Az `az-ekezet-nelkuli` ellenorzes ezert a
 * ceges oszlopot kihagyja.
 */
const MAGYAR_BETU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/

/** A stage OS mentett lablece: a szerkeszto a magyar kezdoertekeket vissza is irta. */
const MENTETT: KezdolapTartalom["footer"] = {
  intro: "",
  social: { facebook: null, instagram: null, youtube: null },
  bottom_text: "",
  columns: [
    {
      title: "Oldaltérkép",
      links: [
        { label: "Nyitóoldal", href: "/" },
        { label: "Forgalmazott márkák", href: "/marka" },
      ],
    },
    {
      title: "Információk",
      links: [
        { label: "Fizetés", href: "/fizetes" },
        { label: "Kézzel írt felirat", href: "/valami" },
      ],
    },
  ],
}
const rekord = (footer: KezdolapTartalom["footer"]): KezdolapTartalom => ({
  texts: {},
  slides: null,
  footer,
})

const feliratok = (a: ReturnType<typeof lablecAdat>) =>
  a.oszlopok.flatMap((o) => [o.cim, ...o.linkek.map((l) => l.cimke)])

afterEach(cleanup)

describe("a lábléc adata angolul", () => {
  it("szerkesztés nélkül sehol nincs magyar ékezetes felirat", () => {
    const a = lablecAdat(null, "en")
    expect(feliratok(a).filter((f) => MAGYAR_BETU.test(f))).toEqual([])
    expect(feliratok(a)).toContain("Sitemap")
    expect(feliratok(a)).toContain("Terms and conditions")
    expect(a.hirlevel?.cim).toBe("Newsletter")
    expect(a.hirlevel?.gomb).toBe("Subscribe")
  })

  it("az OS-ben mentett magyar kezdőértéket fordítja, a kézzel írtat nem", () => {
    const a = lablecAdat(rekord(MENTETT), "en")
    const f = feliratok(a)
    expect(f).toEqual(expect.arrayContaining(["Sitemap", "Home", "Payment"]))
    expect(f).toContain("Brands we carry")
    expect(f).toContain("Kézzel írt felirat")
    // a jogi dokumentumok az "Információk" oszlopba kerulnek, angol felirattal
    const info = a.oszlopok.find((o) => o.cim === "Information")
    expect(info?.linkek.map((l) => l.cimke)).toContain("Privacy notice")
    // az angol cimmel sem nyilik MASODIK informacio-oszlop
    expect(
      a.oszlopok.filter((o) => o.azonosito === "informaciok"),
    ).toHaveLength(0)
    expect(a.oszlopok.filter((o) => o.cim === "Information")).toHaveLength(1)
  })

  it("magyarul ugyanaz, mint nyelv megadása nélkül", () => {
    for (const t of [null, rekord(MENTETT)])
      expect(lablecAdat(t, "hu")).toEqual(lablecAdat(t))
    expect(feliratok(lablecAdat(rekord(MENTETT), "hu"))).toContain(
      "Oldaltérkép",
    )
  })
})

describe("az angol lábléc kirajzolva", () => {
  it("a céges oszlopon kívül nincs benne magyar ékezetes szöveg, a képek leírásában sem", () => {
    const { container } = render(
      <LablecKeret lablec={lablecAdat(null, "en")} locale="en" />,
    )
    const ceg = screen.getByTestId("footer-ceg")
    const szoveg = (container.textContent ?? "").replace(
      ceg.textContent ?? "",
      "",
    )
    expect(szoveg).not.toMatch(MAGYAR_BETU)
    for (const kep of Array.from(container.querySelectorAll("img")))
      expect(kep.getAttribute("alt") ?? "").not.toMatch(MAGYAR_BETU)
    expect(within(ceg).getByText(/Opening hours:/)).toBeTruthy()
    expect(screen.getByTestId("footer-also-sor").textContent).toMatch(
      /All rights reserved\.$/,
    )
  })

  it("a hírlevél-sor angol: a mezők, a gomb, a hozzájárulás linkje", () => {
    render(<LablecKeret lablec={lablecAdat(null, "en")} locale="en" />)
    const sor = screen.getByTestId("lablec-hirlevel")
    expect(within(sor).getByPlaceholderText("Name")).toBeTruthy()
    expect(within(sor).getByPlaceholderText("Email")).toBeTruthy()
    expect(within(sor).getByRole("button").textContent).toBe("Subscribe")
    expect(screen.getByTestId("hirlevel-adatkezeles").textContent).toBe(
      "Privacy notice",
    )
    // a szerveroldali akcio ugyanezen a nyelven ad hibauzenetet
    expect(
      (sor.querySelector('input[name="locale"]') as HTMLInputElement).value,
    ).toBe("en")
  })

  it("a magyar lábléc alapértelmezésben magyar", () => {
    render(<LablecKeret lablec={lablecAdat(null)} />)
    expect(screen.getByTestId("footer-also-sor").textContent).toMatch(
      /Minden jog fenntartva\.$/,
    )
    expect(screen.getByTestId("lablec-hirlevel").textContent).toContain(
      "Feliratkozás",
    )
  })
})
