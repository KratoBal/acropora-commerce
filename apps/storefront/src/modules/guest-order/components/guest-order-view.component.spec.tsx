import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import type { GuestOrder } from "@lib/util/guest-order"

import GuestOrderView from "./guest-order-view"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V1.1). A tracking button without a link the carrier gave (a link the shop built);
  a number shown without the carrier; the "no number yet" sentence missing; a store pickup block with
  tracking lines; the split notice for one order; the pickup block before the delivery block; a
  payment line for a state that has none; money not in grouped forints.
*/
const base: GuestOrder = {
  display_id: 1042,
  created_at: "2026-11-03T10:00:00.000Z",
  total: 15900,
  currency_code: "huf",
  payment_status: "captured",
  business_status: {
    status: "out_for_delivery",
    label: "Kiszállítás",
    updated_at: "2026-11-04T08:00:00.000Z",
    history: [],
  },
  items: [
    { id: "item_1", title: "Reef Pump (Nagy)", quantity: 2, total: 12000 },
  ],
  shipping: {
    method_name: "Foxpost csomagpont",
    pickup_point: { name: "Pont 1", address: "1011 Budapest, Fő u. 1." },
    store_pickup: false,
  },
  tracking: {
    carrier: "foxpost",
    number: "CLFOX0123456789",
    url: "https://carrier.example/t/1",
  },
}

describe("a single order", () => {
  it("shows the status, the payment, the lines, the total and the tracking with the carrier's own link", () => {
    render(<GuestOrderView orders={[base]} />)
    const block = screen.getByTestId("guest-order-1042")
    expect(block.textContent).toContain("Rendelés #1042")
    expect(screen.getByTestId("guest-order-status").textContent).toContain(
      "Úton van",
    )
    expect(screen.getByTestId("guest-order-status").textContent).toContain(
      "A csomagot átvette a futárszolgálat.",
    )
    expect(screen.getByTestId("guest-order-payment").textContent).toContain(
      "Kifizetve",
    )
    expect(block.textContent).toContain("Reef Pump (Nagy) × 2")
    expect(screen.getByTestId("guest-order-total").textContent).toMatch(
      /^15\s900\sFt$/,
    )
    const tracking =
      screen.getByTestId("guest-order-tracking").textContent ?? ""
    expect(tracking).toContain("Szállító: Foxpost")
    expect(tracking).toContain("Csomagszám: CLFOX0123456789")
    expect(tracking).toContain("Átvételi pont: Pont 1, 1011 Budapest, Fő u. 1.")
    const link = screen.getByTestId(
      "guest-order-tracking-link",
    ) as HTMLAnchorElement
    expect(link.href).toBe("https://carrier.example/t/1")
    expect(link.rel).toContain("noopener")
  })

  it("no split notice for a single order", () => {
    render(<GuestOrderView orders={[base]} />)
    expect(screen.queryByTestId("guest-order-split")).toBeNull()
  })

  it("a number without a link: the number and the sentence, no button", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            tracking: { carrier: "gls", number: "99887766", url: null },
          },
        ]}
      />,
    )
    const tracking =
      screen.getByTestId("guest-order-tracking").textContent ?? ""
    expect(tracking).toContain("Csomagszám: 99887766")
    expect(tracking).toContain("A követés most nem érhető el.")
    expect(screen.queryByTestId("guest-order-tracking-link")).toBeNull()
  })

  it("a link that is not https is not drawn (only the number)", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            tracking: {
              carrier: "gls",
              number: "1",
              url: "http://carrier.example/t",
            },
          },
        ]}
      />,
    )
    expect(screen.queryByTestId("guest-order-tracking-link")).toBeNull()
    expect(screen.getByTestId("guest-order-tracking").textContent).toContain(
      "A követés most nem érhető el.",
    )
  })

  it("no number yet: the sentence that says when it appears", () => {
    render(<GuestOrderView orders={[{ ...base, tracking: null }]} />)
    expect(screen.getByTestId("guest-order-tracking").textContent).toContain(
      "A csomagszám akkor jelenik meg, amikor a futár átvette a csomagot.",
    )
    expect(screen.queryByTestId("guest-order-tracking-link")).toBeNull()
  })

  it("a payment state without a line draws no payment block; an unknown status code shows the backend's label", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            payment_status: "requires_action",
            business_status: {
              status: "newcode",
              label: "Új állapot",
              updated_at: "2026-11-04T08:00:00.000Z",
              history: [],
            },
          },
        ]}
      />,
    )
    expect(screen.queryByTestId("guest-order-payment")).toBeNull()
    expect(screen.getByTestId("guest-order-status").textContent).toContain(
      "Új állapot",
    )
  })

  it("an unpaid order says what happens to a bank transfer, without a placeholder (murena's sheet, item 3, variant b)", () => {
    render(
      <GuestOrderView orders={[{ ...base, payment_status: "not_paid" }]} />,
    )
    const text = screen.getByTestId("guest-order-payment").textContent ?? ""
    expect(text).toContain("Előre utalásnál")
    expect(text).toContain("felvesszük veled a kapcsolatot")
    expect(text).not.toMatch(/KITÖLTENDŐ/)
  })

  it("the waiting line by the payment method: the link's own rule for a card order paid by the link, none for cash on delivery", () => {
    const { unmount } = render(
      <GuestOrderView
        orders={[
          { ...base, payment_status: "not_paid", payment_kind: "card_link" },
        ]}
      />,
    )
    const text = screen.getByTestId("guest-order-payment").textContent ?? ""
    expect(text).toContain("Fizetésre vár")
    expect(text).toContain("6 napig")
    expect(text).not.toContain("Előre utalásnál")
    unmount()
    render(
      <GuestOrderView
        orders={[{ ...base, payment_status: "awaiting", payment_kind: "cod" }]}
      />,
    )
    expect(screen.queryByTestId("guest-order-payment")).toBeNull()
  })
})

/*
  AN ADVANCE BY TRANSFER (card d31a66a3, 2b; acrobot 61267). MI PIROSÍT: a partly paid transfer order says "Kifizetve" (or
  "részben kifizetve") instead of "Előleg beérkezett"; the balance is missing or not the shop's; a balance line shows "0" or a
  placeholder when the shop sent none.
*/
describe("an advance received by transfer", () => {
  it("says Előleg beérkezett, with the balance under it", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            payment_status: "partially_captured",
            payment_kind: "transfer",
            outstanding: 2880,
          },
        ]}
      />,
    )
    const text = screen.getByTestId("guest-order-payment").textContent ?? ""
    expect(text).toContain("Előleg beérkezett")
    expect(text).not.toContain("Kifizetve")
    expect(screen.getByTestId("guest-order-outstanding").textContent).toMatch(
      /^Hátralék: 2\s?880\sFt$/,
    )
  })

  // acrobot 63071: the number the OS's bank pairing looks for on the balance's transfer; without it, no sentence and no placeholder
  it("under the balance: the number to name on its transfer, and nothing when the shop sent none", () => {
    const { unmount } = render(
      <GuestOrderView
        orders={[
          {
            ...base,
            payment_status: "partially_captured",
            payment_kind: "transfer",
            outstanding: 2880,
            balance_reference: "D-CRPR-7",
          },
        ]}
      />,
    )
    expect(
      screen.getByTestId("guest-order-balance-reference").textContent,
    ).toBe("Utalásnál a közleménybe kérjük, írd be ezt a számot: D-CRPR-7")
    unmount()

    for (const balance_reference of [null, undefined]) {
      const { unmount: again } = render(
        <GuestOrderView
          orders={[
            {
              ...base,
              payment_status: "partially_captured",
              payment_kind: "transfer",
              outstanding: 2880,
              balance_reference,
            },
          ]}
        />,
      )
      expect(screen.queryByTestId("guest-order-balance-reference")).toBeNull()
      const text = screen.getByTestId("guest-order-payment").textContent ?? ""
      expect(text).not.toContain("proformaNumber")
      expect(text).not.toContain("közleménybe")
      again()
    }
  })

  it("without the balance from the shop: the label stands, and no balance line", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            payment_status: "partially_captured",
            payment_kind: "transfer",
          },
        ]}
      />,
    )
    expect(screen.getByTestId("guest-order-payment").textContent).toContain(
      "Előleg beérkezett",
    )
    expect(screen.queryByTestId("guest-order-outstanding")).toBeNull()
  })
})

describe("a released card hold, as the shop really has it", () => {
  it("every collection canceled and the kind card_released: the released hold's sentence, no link and no deadline (barracuda on #891 v2)", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            payment_status: "canceled",
            payment_kind: "card_released",
          },
        ]}
      />,
    )
    const text = screen.getByTestId("guest-order-payment").textContent ?? ""
    expect(text).toContain("feloldottuk")
    expect(text).not.toContain("6 napig")
    expect(text).not.toContain("lezárjuk")
  })
})

describe("a mixed cart's two orders", () => {
  const pickup: GuestOrder = {
    ...base,
    display_id: 1041,
    tracking: null,
    shipping: {
      method_name: "Bolti átvétel",
      pickup_point: null,
      store_pickup: true,
    },
    business_status: {
      status: "ready_for_pickup",
      label: "Átvehető",
      updated_at: "2026-11-04T08:00:00.000Z",
      history: [],
    },
  }

  it("one notice, the delivery block first with its own heading, the pickup block after", () => {
    render(<GuestOrderView orders={[pickup, base]} />)
    expect(screen.getByTestId("guest-order-split").textContent).toContain(
      "két rendelésből áll",
    )
    const view = screen.getByTestId("guest-order-view")
    const blocks = Array.from(view.querySelectorAll("section")).map(
      (section) => section.textContent ?? "",
    )
    expect(blocks).toHaveLength(2)
    expect(blocks[0]).toContain("Kiszállítandó termékek")
    expect(blocks[0]).toContain("Rendelés #1042")
    expect(blocks[1]).toContain("Élő állatok, átvétel a boltban")
    expect(blocks[1]).toContain("Rendelés #1041")
  })

  it("the store pickup block has no carrier, number or tracking sentence", () => {
    render(<GuestOrderView orders={[pickup, base]} />)
    const text = screen.getByTestId("guest-order-1041").textContent ?? ""
    expect(text).not.toContain("Szállító:")
    expect(text).not.toContain("Csomagszám")
    expect(text).not.toContain("csomagszám")
    expect(text).toContain("A rendelésed átvehető.")
  })
})

describe("the problem button", () => {
  it("is drawn only with the address the orders were opened with, and opens the form of THAT order", () => {
    const { rerender } = render(<GuestOrderView orders={[base]} />)
    expect(screen.queryByTestId("problem-open-1042")).toBeNull()
    rerender(<GuestOrderView orders={[base]} email="vevo@example.hu" />)
    fireEvent.click(screen.getByTestId("problem-open-1042"))
    expect(screen.getByTestId("problem-form-1042")).toBeTruthy()
    expect(screen.queryByTestId("problem-open-1042")).toBeNull()
  })

  it("is not drawn for an order with no lines", () => {
    render(
      <GuestOrderView
        orders={[{ ...base, items: [] }]}
        email="vevo@example.hu"
      />,
    )
    expect(screen.queryByTestId("problem-open-1042")).toBeNull()
  })

  it("lists the problem reports the order already has, with the case reference and a two-step state", () => {
    render(
      <GuestOrderView
        orders={[
          {
            ...base,
            problem_reports: [
              {
                id: "ordprb_01A",
                kind: "item_damaged",
                created_at: "2026-11-04T10:00:00.000Z",
                stage: "received",
              },
              {
                id: "ordprb_01B",
                kind: "animal_dead",
                created_at: "2026-11-05T10:00:00.000Z",
                stage: "in_progress",
              },
            ],
          },
        ]}
      />,
    )
    const list = screen.getByTestId("problem-reports-1042")
    expect(list.textContent).toContain("Már leadott bejelentéseid")
    expect(list.textContent).toContain("A termék sérült vagy hibás")
    expect(list.textContent).toContain("Ügy azonosítója: ordprb_01A")
    expect(list.textContent).toContain("Beérkezett")
    expect(list.textContent).toContain("Az állat elpusztult")
    expect(list.textContent).toContain("Átvette a csapatunk")
  })

  it("draws no report list for an order without reports, or from an answer that has no such field", () => {
    render(<GuestOrderView orders={[base]} />)
    expect(screen.queryByTestId("problem-reports-1042")).toBeNull()
    cleanup()
    render(<GuestOrderView orders={[{ ...base, problem_reports: [] }]} />)
    expect(screen.queryByTestId("problem-reports-1042")).toBeNull()
  })
})
