import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({ countryCode: "hu" }))
vi.mock("@lib/data/own-withdrawal", () => ({ submitOwnWithdrawal: vi.fn() }))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
}))
const muveletek = vi.hoisted(() => ({ createTransferRequest: vi.fn() }))
vi.mock("@lib/data/orders", () => muveletek)

import { translator } from "@lib/i18n/dictionary"
import {
  allapotFelirat,
  fizetesiAllapot,
  kapcsoltFelirat,
  rendelesDatum,
  rendelesDatumRovid,
} from "@lib/util/rendelesek"
import {
  fizetesiMod,
  osszesitoSorok,
  vegosszegCimke,
} from "@lib/util/rendeles-reszletek"
import RendelesReszletek from "@modules/account/components/rendeles-reszletek"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

import Rendelesek from "."

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  nav.countryCode = "hu"
})

const hu = translator("hu")
const en = translator("en")

const rendeles = (
  id: string,
  display_id: number,
  extra: Record<string, unknown> = {},
) =>
  ({
    id,
    display_id,
    total: 396980,
    currency_code: "huf",
    created_at: "2026-09-28T10:00:00.000Z",
    payment_status: "captured",
    items: [{ quantity: 2 }, { quantity: 1 }],
    ...extra,
  }) as never
const allapot = (order_id: string, status: string, label: string) => ({
  order_id,
  status,
  label,
  updated_at: "2026-09-29T10:00:00.000Z",
})

/**
 * A RENDELESEK A LAP NYELVEN (2026-11-03). MI PIROSIT: ha az angol uton a
 * hatter magyar allapot-cimkeje jelenik meg; ha egy ismeretlen allapot
 * elveszik (a hatter kesobb ujat vehet fel); ha a datum nem a lap nyelvu; ha
 * a magyar ut szovege elmozdul; ha az atveteli hiba a szerver nyers szovege.
 */
describe("a rendelések segédfüggvényei a lap nyelvén", () => {
  it("az üzleti állapot felirata a szótárból, az ismeretlené a háttéré", () => {
    const sor = allapot("o1", "confirmed", "Visszaigazolva")
    expect(allapotFelirat(sor, hu)).toBe("Visszaigazolva")
    expect(allapotFelirat(sor, en)).toBe("Confirmed")
    expect(
      allapotFelirat(allapot("o1", "closed_unsuccessfully", "x"), en),
    ).toBe("Closed unsuccessfully")
    // an unknown status keeps the back end's own label, in both languages
    const ismeretlen = allapot("o1", "uj_allapot", "Új állapot")
    expect(allapotFelirat(ismeretlen, en)).toBe("Új állapot")
    expect(allapotFelirat(ismeretlen, hu)).toBe("Új állapot")
  })

  it("a fizetési állapot, a pár felirata és a dátum a nyelven áll", () => {
    expect(fizetesiAllapot("captured")).toBe("kifizetve")
    expect(fizetesiAllapot("captured", en)).toBe("paid")
    expect(fizetesiAllapot("nincs-ilyen", en)).toBe("")
    expect(kapcsoltFelirat(13, true)).toBe("Egy leadásból: #13, bolti átvétel")
    expect(kapcsoltFelirat(13, false, en)).toBe(
      "From one checkout: #13, delivery",
    )
    expect(rendelesDatum("2026-09-28T10:00:00.000Z")).toBe(
      "2026. szeptember 28.",
    )
    expect(rendelesDatum("2026-09-28T10:00:00.000Z", "en")).toBe(
      "28 September 2026",
    )
    expect(rendelesDatumRovid("2026-09-28T10:00:00.000Z", "en")).toBe(
      "28/09/2026",
    )
  })

  it("a részletek segédei: a két saját fizetési mód, az összesítő sorai és a végösszeg", () => {
    const cod = {
      payment_collections: [
        {
          payments: [],
          payment_sessions: [{ provider_id: "pp_acropora_cod" }],
        },
      ],
    }
    expect(fizetesiMod(cod)).toBe("Utánvét")
    expect(fizetesiMod(cod, en)).toBe("Cash on delivery")
    expect(
      fizetesiMod(
        {
          payment_collections: [
            {
              payments: [{ provider_id: "pp_system_default" }],
              payment_sessions: [],
            },
          ],
        },
        en,
      ),
    ).toBe("Pay on pickup")
    const kosar = {
      items: [
        { id: "a", total: 1000, metadata: {} },
        {
          id: "b",
          title: undefined,
          total: 450,
          metadata: { acropora_line_item_kind: "fee" },
        },
      ],
      shipping_methods: [{ total: 3500 }],
    }
    expect(osszesitoSorok(kosar, en).map((s) => s.cimke)).toEqual([
      "Products",
      "Fee",
      "Shipping",
    ])
    expect(osszesitoSorok(kosar).map((s) => s.cimke)).toEqual([
      "Termékek",
      "Díj",
      "Szállítás",
    ])
    expect(vegosszegCimke("captured", en)).toBe("Amount paid")
    expect(vegosszegCimke("awaiting", en)).toBe("Total")
    expect(vegosszegCimke("captured")).toBe("Fizetett összeg")
  })
})

describe("a Rendeléseim lap a lap nyelvén", () => {
  it("angolul: a címke, a dátum, a fizetés, a gombok és a lezárt szakasz angol", () => {
    nav.countryCode = "en-hu"
    render(
      <Rendelesek
        rendelesek={[
          rendeles("order_1", 12),
          rendeles("order_2", 11, { payment_status: "refunded" }),
        ]}
        allapotok={[
          allapot("order_1", "confirmed", "Visszaigazolva"),
          allapot("order_2", "closed", "Megrendelés lezárva"),
        ]}
        t={en}
        locale="en"
      />,
    )
    const kartya = screen.getByTestId("rendeles-nyitott")
    expect(within(kartya).getByTestId("rendeles-allapot").textContent).toBe(
      "Confirmed",
    )
    expect(kartya.textContent).toContain("28 September 2026 · paid")
    expect(within(kartya).getByTestId("rendeles-reszletek").textContent).toBe(
      "Order details",
    )
    expect(screen.getByText("Past orders")).toBeTruthy()
    const korabbi = screen.getByTestId("rendeles-korabbi")
    expect(korabbi.textContent).toContain("Order closed")
    expect(korabbi.textContent).toContain("3 items")
    expect(korabbi.textContent).toContain("view")
  })

  it("angolul az üres lista mondata és a gomb angol", () => {
    render(<Rendelesek rendelesek={[]} allapotok={[]} t={en} locale="en" />)
    expect(screen.getByTestId("no-orders-container").textContent).toContain(
      "You have no orders yet.",
    )
    expect(screen.getByTestId("continue-shopping-button").textContent).toBe(
      "Shop",
    )
  })

  it("a kapcsolt rendelés felirata angolul", () => {
    render(
      <Rendelesek
        rendelesek={[
          rendeles("order_1", 12, {
            metadata: { acropora_pickup_order_id: "order_2" },
          }),
          rendeles("order_2", 13),
        ]}
        allapotok={[]}
        t={en}
        locale="en"
      />,
    )
    expect(screen.getAllByTestId("rendeles-kapcsolt")[0].textContent).toBe(
      "From one checkout: #13, in-store pickup",
    )
  })
})

describe("a rendelés részletei a lap nyelvén", () => {
  const RENDELES = {
    id: "order_1",
    display_id: 1,
    currency_code: "huf",
    created_at: "2026-09-29T13:06:53.470Z",
    total: 4950,
    payment_status: "awaiting",
    items: [
      {
        id: "i1",
        title: "Aquavital Perlonvatta 100g",
        product_title: "Aquavital Perlonvatta 100g",
        quantity: 2,
        total: 1000,
        metadata: {},
      },
    ],
    shipping_methods: [{ name: "GLS házhozszállítás", total: 3500 }],
    shipping_address: {
      first_name: "P5",
      last_name: "Teszt",
      address_1: "Minta utca 12.",
      postal_code: "1111",
      city: "Budapest",
    },
    billing_address: {
      first_name: "P5",
      last_name: "Teszt",
      address_1: "Minta utca 12.",
      postal_code: "1111",
      city: "Budapest",
      company: null,
      metadata: {},
    },
    payment_collections: [
      { payments: [], payment_sessions: [{ provider_id: "pp_acropora_cod" }] },
    ],
  } as never

  it("angolul a fej, a kártyák, az összesítő és a kérdés-doboz angol, az adat nem fordul", () => {
    render(
      <RendelesReszletek
        rendeles={RENDELES}
        allapot={allapot("order_1", "pending_processing", "Feldolgozásra vár")}
        t={en}
        locale="en"
      />,
    )
    const lap = screen.getByTestId("rendeles-reszletek-lap")
    expect(lap.textContent).toContain("My order")
    expect(lap.textContent).toContain("Waiting to be processed")
    expect(lap.textContent).toContain("29 September 2026")
    expect(lap.textContent).toContain("Cash on delivery")
    expect(lap.textContent).toContain("awaiting payment")
    expect(screen.getByTestId("vissza-rendelesekhez").textContent).toBe(
      "‹ My orders",
    )
    expect(
      within(screen.getByTestId("rendeles-tetelek")).getByText("2 pcs"),
    ).toBeTruthy()
    const osszesites = screen.getByTestId("rendeles-osszesites")
    expect(osszesites.textContent).toContain("Products")
    expect(osszesites.textContent).toContain("Total")
    expect(screen.getByTestId("rendeles-kerdes").textContent).toBe(
      "Ask about this order",
    )
    expect(
      screen.getByTestId("rendeles-kerdes").getAttribute("href"),
    ).toContain("subject=Order%20%231")
    // data stays as it is: the product title and the shipping method's name
    expect(lap.textContent).toContain("Aquavital Perlonvatta 100g")
    expect(lap.textContent).toContain("GLS házhozszállítás")
    expect(lap.textContent).toContain("Shipping address: ")
  })
})

describe("az átvételi kérelem űrlapja a lap nyelvén", () => {
  const kuld = async () => {
    const { fireEvent, act } = await import("@testing-library/react")
    await act(async () => {
      fireEvent.submit(
        screen
          .getByPlaceholderText(/Order ID|Rendelésazonosító/)
          .closest("form")!,
      )
    })
  }

  it("angolul a címek és a hiba KÓDJÁBÓL az angol mondat, a nyers szöveg nem megy ki", async () => {
    nav.countryCode = "en-hu"
    muveletek.createTransferRequest.mockResolvedValue({
      success: false,
      error: "generic",
      order: null,
    })
    render(<TransferRequestForm />)
    expect(screen.getByText("Claim an order")).toBeTruthy()
    await kuld()
    expect(
      screen.getByText(
        "We could not request the transfer right now. Try again, or write to us.",
      ),
    ).toBeTruthy()
  })

  it("az azonosító hiánya külön mondat, magyarul is", async () => {
    muveletek.createTransferRequest.mockResolvedValue({
      success: false,
      error: "order_id_required",
      order: null,
    })
    render(<TransferRequestForm />)
    await kuld()
    expect(screen.getByText("Add meg a rendelés azonosítóját.")).toBeTruthy()
  })
})
