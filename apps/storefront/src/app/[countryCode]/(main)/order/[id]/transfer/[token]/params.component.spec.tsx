import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({
  elfogad: vi.fn(async (_id: string, _token: string) => ({
    success: true,
    error: null as string | null,
  })),
  elutasit: vi.fn(async (_id: string, _token: string) => ({
    success: true,
    error: null as string | null,
  })),
}))
vi.mock("@lib/data/orders", () => ({
  acceptTransferRequest: adat.elfogad,
  declineTransferRequest: adat.elutasit,
}))
vi.mock("@modules/order/components/transfer-image", () => ({
  default: () => null,
}))
vi.mock("@modules/order/components/transfer-actions", () => ({
  default: ({ id, token }: { id: string; token: string }) => (
    <div data-testid="transfer-actions" data-id={id} data-token={token} />
  ),
}))

import AcceptPage from "./accept/page"
import DeclinePage from "./decline/page"
import TransferPage from "./page"

/**
 * A HARMAS ATVITEL-OLDAL A `params`-OT PROMISE-KENT OLVASSA. A Next 15-ben a szinkron `params` (egy sima objektum) meg mukodott, a Next 16-ban a `params` KIZAROLAG
 * Promise, es egy szinkron olvasas nem hibat dob: az oldal HTTP 200-zal renderel, de az order-szam es a token UKES (merve 2026-11-23, helyi Next 16.4.6 szerveren: "Transfer
 * request for order  "). Az accept es a decline oldal a renderelesben HIVJA az atvitelt, tehat ures azonositoval hivna. Ami pirosit: egy oldal a Promise-t objektumkent olvassa
 * (az id nem jelenik meg az oldalon, a data-fuggveny nem a kapott id-t es tokent kapja).
 */
const params = () =>
  Promise.resolve({ id: "order_01TESZT", token: "tok_TESZT" })

describe("az atvitel-oldalak a params Promise-t olvassak", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("a kerelem oldala megjeleniti az order-szamot, es a gombok a kapott id-t es tokent kapjak", async () => {
    render(await TransferPage({ params: params() }))
    expect(
      screen.getByText(/Transfer request for order order_01TESZT/),
    ).toBeInTheDocument()
    const gombok = screen.getByTestId("transfer-actions")
    expect(gombok.getAttribute("data-id")).toBe("order_01TESZT")
    expect(gombok.getAttribute("data-token")).toBe("tok_TESZT")
  })

  it("az elfogadas a kapott id-vel es tokennel hivja az atvitelt, es az oldal megnevezi a rendelest", async () => {
    render(await AcceptPage({ params: params() }))
    expect(adat.elfogad).toHaveBeenCalledWith("order_01TESZT", "tok_TESZT")
    expect(screen.getByText(/order_01TESZT/)).toBeInTheDocument()
  })

  it("az elutasitas a kapott id-vel es tokennel hivja az atvitelt, es az oldal megnevezi a rendelest", async () => {
    render(await DeclinePage({ params: params() }))
    expect(adat.elutasit).toHaveBeenCalledWith("order_01TESZT", "tok_TESZT")
    expect(screen.getByText(/order_01TESZT/)).toBeInTheDocument()
  })
})
