import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@lib/data/cart", () => ({
  retrieveCartShippingClass: vi.fn(async () => null),
}))
const fulfillment = vi.hoisted(() => ({ listCartShippingMethods: vi.fn() }))
vi.mock("@lib/data/fulfillment", () => fulfillment)
vi.mock("@lib/data/payment", () => ({
  listCartPaymentMethods: vi.fn(async () => []),
  getCartPaymentOptions: vi.fn(async () => null),
}))
// A fizetesi mod a sajat specjeiben merve (a bankkartya panelje a mondattal);
// itt a lap keretet nezzuk, ezert a reszek helyett jelolok allnak.
vi.mock("@modules/checkout/components/payment", () => ({
  default: () => <div data-testid="fizetesi-mod" />,
}))
vi.mock("@modules/checkout/components/aszf-elfogadas", () => ({
  default: () => <div data-testid="aszf" />,
  AszfProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
}))
vi.mock("@modules/checkout/components/rendelesi-adatok", () => ({
  default: () => null,
}))
vi.mock("@modules/checkout/components/rendelesed", () => ({
  default: () => null,
}))
const csoportok = vi.hoisted(() => ({
  props: [] as { szemelyesAtvetel?: boolean }[],
}))
vi.mock("@modules/checkout/components/szallitasi-csoportok", () => ({
  default: (props: { szemelyesAtvetel?: boolean }) => {
    csoportok.props.push(props)
    return null
  },
}))
vi.mock("@modules/checkout/components/discount-code", () => ({
  default: () => null,
}))

import FizetesiOldal from "./index"

afterEach(cleanup)

/**
 * A STRIPE BIZALMI MONDATA (acrobot 27110). MI PIROSIT: a "Rendelés
 * véglegesítése" kartyan, ami minden fizetesi modnal latszik (utanvet, elore
 * utalas, bolti fizetes), ujra megjelenik a kartyaadatokrol szolo mondat.
 */
describe("a fizetési oldal véglegesítése", () => {
  it("az ÁSZF-et kéri, a kártyaadatokról szóló mondat nélkül", async () => {
    render(
      await FizetesiOldal({
        cart: { id: "cart_1" } as never,
        countryCode: "hu",
      }),
    )
    const veglegesites = screen.getByTestId("veglegesites")
    expect(within(veglegesites).getByTestId("aszf")).toBeInTheDocument()
    expect(screen.getByTestId("fizetesi-mod")).toBeInTheDocument()
    expect(screen.queryByText(/kártyaadatokat/)).toBeNull()
  })

  /**
   * A FIZETESI OLDAL A KEZDOLAP STILUSAT KAPJA (Balazs 2026-11-02 "mindegyik mehet"): a cim a kezdolap szerif betuje, normal
   * vastagsaggal. MI PIROSIT: ha a cim a talpatlan marad.
   */
  it("a cím a kezdőlap szerif betűjével, normál vastagsággal", async () => {
    render(
      await FizetesiOldal({
        cart: { id: "cart_1" } as never,
        countryCode: "hu",
      }),
    )
    const cim = screen.getByRole("heading", { level: 1 }).className
    expect(cim).toContain("font-kiemelt")
    expect(cim).toContain("font-normal")
    expect(cim).toContain("tracking-[-0.01em]")
  })

  /*
    A SZALLITASI CSOPORT "ATVETEL" SZEMELYES ATVETELNEL (acrobot 49701): a lap a kosar valasztott szallitasi opciojanak
    fulfillment-tipusabol dont (`pickup`), ugyanabbol a jelbol, amit a szallitasi lepes hasznal. MI PIROSIT: ha a lap nem
    adja at a jelet; ha a nem `pickup` opcio is atvetelnek szamit; ha opcio nelkuli kosarnal is lekerdezes indul.
  */
  describe("a személyes átvétel jele a szállítási csoportoknak", () => {
    const kosar = (opcio: string | null) =>
      ({
        id: "cart_1",
        shipping_methods: opcio ? [{ shipping_option_id: opcio }] : [],
      }) as never
    const opciok = (tipus: string) => [
      { id: "so_1", service_zone: { fulfillment_set: { type: tipus } } },
    ]

    it.each([
      ["pickup", true],
      ["shipping", false],
    ])("a %s tipusú opció átadott jele: %s", async (tipus, vart) => {
      csoportok.props.length = 0
      fulfillment.listCartShippingMethods.mockResolvedValue(opciok(tipus))
      render(await FizetesiOldal({ cart: kosar("so_1"), countryCode: "hu" }))
      expect(fulfillment.listCartShippingMethods).toHaveBeenCalledWith("cart_1")
      expect(csoportok.props.at(-1)?.szemelyesAtvetel).toBe(vart)
    })

    it("szállítási mód nélkül nincs lekérdezés, és nem átvétel", async () => {
      csoportok.props.length = 0
      fulfillment.listCartShippingMethods.mockClear()
      render(await FizetesiOldal({ cart: kosar(null), countryCode: "hu" }))
      expect(fulfillment.listCartShippingMethods).not.toHaveBeenCalled()
      expect(csoportok.props.at(-1)?.szemelyesAtvetel).toBe(false)
    })
  })
})
