import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const initiatePaymentSession = vi.fn()
const egyeztesdAzUtanvetDijat = vi.fn()
const refresh = vi.fn()

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn(), refresh }),
  useSearchParams: () => new URLSearchParams("step=payment"),
}))

vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: (...args: unknown[]) =>
    initiatePaymentSession(...args),
}))

vi.mock("@lib/data/payment", () => ({
  egyeztesdAzUtanvetDijat: (...args: unknown[]) =>
    egyeztesdAzUtanvetDijat(...args),
}))

import Payment from "./index"

afterEach(cleanup)
beforeEach(() => {
  initiatePaymentSession.mockReset()
  initiatePaymentSession.mockResolvedValue({ ok: true })
  egyeztesdAzUtanvetDijat.mockReset()
  refresh.mockReset()
})

function kosar() {
  return {
    id: "cart-1",
    currency_code: "huf",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: { payment_sessions: [] },
  } as unknown as HttpTypes.StoreCart
}

function utanvetetValaszt() {
  render(
    <Payment
      cart={kosar()}
      availablePaymentMethods={[{ id: "pp_acropora_cod" }]}
      engedelyezettModok={[{ id: "pp_acropora_cod", role: "COD" }]}
    />,
  )
  fireEvent.click(screen.getByText("Utánvét"))
}

describe("az utánvét választása", () => {
  /**
   * A HÁROM LÉPÉS SORRENDJE, ÉS EZ A SPEC LÉNYEGE.
   *
   * A díj felvitele mozdítja a végösszeget, a Medusa pedig eldobja azt a
   * fizetési munkamenetet, ami már nem illik a végösszeghez. A válasz ezt a
   * `valasztottSzerep: null` értékkel mondja meg. Újraindítás nélkül a lánc
   * NEM hibázik, csak elromlik: a vevő látná a díjat, és fizetés közben tűnne
   * el alóla a munkamenet.
   */
  it("a díj felvitele után ÚJRA elindítja a fizetési munkamenetet", async () => {
    egyeztesdAzUtanvetDijat.mockResolvedValue({
      ok: true,
      dij: 450,
      valasztottSzerep: null,
    })

    utanvetetValaszt()

    await waitFor(() => expect(initiatePaymentSession).toHaveBeenCalledTimes(2))
    expect(egyeztesdAzUtanvetDijat).toHaveBeenCalledWith("cart-1")
    expect(refresh).toHaveBeenCalled()
  })

  /**
   * A MÁSIK IRÁNY, ENÉLKÜL AZ ELŐZŐ ÁLLÍTÁS NEM BIZONYÍT SEMMIT: egy olyan
   * változat, ami MINDIG kétszer indít munkamenetet, az előző teszten is
   * átmenne.
   */
  it("ha a munkamenet túlélte, NEM indítja el másodszor", async () => {
    egyeztesdAzUtanvetDijat.mockResolvedValue({
      ok: true,
      dij: 0,
      valasztottSzerep: "PAY_AT_STORE",
    })

    utanvetetValaszt()

    await waitFor(() => expect(egyeztesdAzUtanvetDijat).toHaveBeenCalled())
    expect(initiatePaymentSession).toHaveBeenCalledTimes(1)
  })

  it("a díjat a háttér válaszából írja ki, forintban", async () => {
    egyeztesdAzUtanvetDijat.mockResolvedValue({
      ok: true,
      dij: 450,
      valasztottSzerep: null,
    })

    utanvetetValaszt()

    await waitFor(() =>
      expect(screen.getByTestId("utanvet-dij").textContent).toContain("450"),
    )
  })

  /**
   * A KIRAKAT NEM TALÁL KI ÖSSZEGET. Nulla díjnál nincs mit kiírni, és
   * különösen nem a kódban álló 450-es tartalék: az a HÁTTERÉ, és a háttér
   * küldi a válaszában, ha érvényes.
   */
  it("nulla díjnál semmilyen összeg nem jelenik meg", async () => {
    egyeztesdAzUtanvetDijat.mockResolvedValue({
      ok: true,
      dij: 0,
      valasztottSzerep: "COD",
    })

    utanvetetValaszt()

    await waitFor(() => expect(egyeztesdAzUtanvetDijat).toHaveBeenCalled())
    expect(screen.queryByTestId("utanvet-dij")).toBeNull()
  })

  it("az egyeztetés hibáját kiírja, és nem indít újabb munkamenetet", async () => {
    egyeztesdAzUtanvetDijat.mockResolvedValue({
      ok: false,
      uzenet: "A fizetés most nem sikerült.",
    })

    utanvetetValaszt()

    await waitFor(() =>
      expect(
        screen.getByTestId("payment-method-error-message").textContent,
      ).toContain("nem sikerült"),
    )
    expect(initiatePaymentSession).toHaveBeenCalledTimes(1)
  })

  /**
   * AZ EGYEZTETÉS MINDEN MÓDNÁL LEFUT, nem csak az utánvétnél: a végpont
   * összevezet, nem hozzáad. Ha csak utánvétnél hívnánk, az utánvétről
   * kártyára váltó vevőnél a díj ottmaradna -- a munkamenet létrehozása nem
   * frissíti a kosarat, tehát semmi más nem venné le.
   */
  it("bolti fizetés választásakor IS lefut az egyeztetés", async () => {
    egyeztesdAzUtanvetDijat.mockResolvedValue({
      ok: true,
      dij: 0,
      valasztottSzerep: "PAY_AT_STORE",
    })

    render(
      <Payment
        cart={kosar()}
        availablePaymentMethods={[{ id: "pp_system_default" }]}
        engedelyezettModok={[{ id: "pp_system_default", role: "PAY_AT_STORE" }]}
      />,
    )
    fireEvent.click(screen.getByText("Fizetés a boltban"))

    await waitFor(() =>
      expect(egyeztesdAzUtanvetDijat).toHaveBeenCalledWith("cart-1"),
    )
  })
})
