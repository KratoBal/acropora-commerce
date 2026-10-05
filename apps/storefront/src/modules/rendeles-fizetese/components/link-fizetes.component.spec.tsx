import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const sorrend = vi.hoisted(() => ({ log: [] as string[] }))
const stripe = vi.hoisted(() => ({ confirmPayment: vi.fn() }))
const mezo = vi.hoisted(() => ({ update: vi.fn() }))
const elements = vi.hoisted(() => ({
  submit: vi.fn(),
  getElement: vi.fn(() => mezo),
}))
const router = vi.hoisted(() => ({ replace: vi.fn(), refresh: vi.fn() }))
const mezoAllapot = vi.hoisted(() => ({ complete: true }))

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => stripe,
  useElements: () => elements,
  // a mezo "kitoltve" jelez, ahogy a Stripe a valodi kitoltes utan
  PaymentElement: ({
    onChange,
  }: {
    onChange: (e: { complete: boolean }) => void
  }) => {
    queueMicrotask(() => onChange({ complete: mezoAllapot.complete }))
    return <div data-testid="payment-element" />
  },
}))
vi.mock("@modules/checkout/components/payment-wrapper", () => ({
  stripePromise: Promise.resolve({}),
}))
vi.mock("@modules/checkout/components/payment-wrapper/stripe-wrapper", () => ({
  StripeHalasztott: ({
    children,
    osszeg,
  }: {
    children: React.ReactNode
    osszeg: number
  }) => (
    <div data-testid="halasztott" data-osszeg={osszeg}>
      {children}
    </div>
  ),
}))
vi.mock("next/navigation", () => ({ useRouter: () => router }))
vi.mock("@lib/data/rendeles-fizetese", () => ({
  inditsLinkFizetest: vi.fn(async () => {
    sorrend.log.push("session")
    return { ok: true, titok: "pi_link_secret" }
  }),
  fejezdBeLinkFizetest: vi.fn(async () => {
    sorrend.log.push("complete")
    return { ok: true }
  }),
}))

import {
  fejezdBeLinkFizetest,
  inditsLinkFizetest,
} from "@lib/data/rendeles-fizetese"
import LinkFizetes, { LINK_ELUTASITVA } from "./link-fizetes"

/**
 * A „RENDELÉS FIZETÉSE” FIZETESI RESZE. Ami pirosit:
 * - a fizetes a mezo ellenorzese elott indul;
 * - a PaymentIntent a megerosites helyett mashonnan jon;
 * - a befejezes (levonas) a megerosites elott, vagy egy elutasitott kartyara
 *   fut;
 * - a 3-D Secure utan a lap nem fejezi be maga;
 * - a mezo nem a link osszegere all;
 * - a gomb nem az osszeget mondja.
 */
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sorrend.log.length = 0
  mezoAllapot.complete = true
  window.history.replaceState(null, "", "/")
})

const megjelenit = () =>
  render(<LinkFizetes token="t.s" osszeg={9800} countryCode="hu" />)
const gomb = () => screen.getByTestId("link-fizetes-gomb")

describe("LinkFizetes", () => {
  it("a mezo a link osszegere all, a gomb az osszeget mondja", async () => {
    megjelenit()
    // a Stripe a forintot szazadokban keri (stripeEgyseg): 9800 Ft = 980000
    expect(screen.getByTestId("halasztott").getAttribute("data-osszeg")).toBe(
      "980000",
    )
    await waitFor(() => expect(gomb().hasAttribute("disabled")).toBe(false))
    expect(gomb().textContent?.replace(/\s/g, " ")).toBe("Fizetés: 9 800 Ft")
  })

  it("a sorrend: ellenorzes, PaymentIntent, megerosites a titokkal, befejezes", async () => {
    elements.submit.mockImplementation(async () => {
      sorrend.log.push("submit")
      return {}
    })
    stripe.confirmPayment.mockImplementation(
      async (arg: {
        clientSecret: string
        confirmParams: { return_url: string }
      }) => {
        sorrend.log.push(
          `confirm ${arg.clientSecret} ${arg.confirmParams.return_url}`,
        )
        return { paymentIntent: { status: "requires_capture" } }
      },
    )
    megjelenit()
    await waitFor(() => expect(gomb().hasAttribute("disabled")).toBe(false))
    fireEvent.click(gomb())
    await waitFor(() => expect(router.refresh).toHaveBeenCalled())
    expect(sorrend.log).toEqual([
      "submit",
      "session",
      `confirm pi_link_secret ${window.location.origin}/hu/rendeles-fizetese/t.s`,
      "complete",
    ])
    expect(router.replace).toHaveBeenCalledWith("/hu/rendeles-fizetese/t.s")
  })

  it("egy hibas mezo nem indit fizetest", async () => {
    elements.submit.mockResolvedValue({
      error: { type: "validation_error", message: "Hiányzik" },
    })
    megjelenit()
    await waitFor(() => expect(gomb().hasAttribute("disabled")).toBe(false))
    fireEvent.click(gomb())
    await waitFor(() =>
      expect(gomb().getAttribute("data-allapot")).toBe("alap"),
    )
    expect(inditsLinkFizetest).not.toHaveBeenCalled()
  })

  it("elutasitott kartya: nincs befejezes, a mondat es a „Próbáld újra”", async () => {
    elements.submit.mockResolvedValue({})
    stripe.confirmPayment.mockResolvedValue({
      error: {
        type: "card_error",
        payment_intent: { status: "requires_payment_method" },
      },
    })
    megjelenit()
    await waitFor(() => expect(gomb().hasAttribute("disabled")).toBe(false))
    fireEvent.click(gomb())
    await waitFor(() =>
      expect(screen.getByTestId("link-elutasitva").textContent).toBe(
        LINK_ELUTASITVA,
      ),
    )
    expect(gomb().textContent).toBe("Próbáld újra")
    expect(fejezdBeLinkFizetest).not.toHaveBeenCalled()
  })

  it("a hatter elutasitasa (lejart link) a hatter mondatat mutatja", async () => {
    elements.submit.mockResolvedValue({})
    vi.mocked(inditsLinkFizetest).mockResolvedValueOnce({
      ok: false,
      uzenet: "Ez a fizetési link lejárt. Írj nekünk, és segítünk.",
    })
    megjelenit()
    await waitFor(() => expect(gomb().hasAttribute("disabled")).toBe(false))
    fireEvent.click(gomb())
    await waitFor(() =>
      expect(
        screen.getByText("Ez a fizetési link lejárt. Írj nekünk, és segítünk."),
      ).toBeTruthy(),
    )
    expect(stripe.confirmPayment).not.toHaveBeenCalled()
  })

  it("a 3-D Secure utan a lap maga fejezi be; sikertelen hitelesitesnel nem", async () => {
    window.history.replaceState(
      null,
      "",
      "/hu/rendeles-fizetese/t.s?payment_intent=pi_1&redirect_status=succeeded",
    )
    megjelenit()
    await waitFor(() =>
      expect(fejezdBeLinkFizetest).toHaveBeenCalledWith("t.s"),
    )
    cleanup()
    vi.clearAllMocks()
    window.history.replaceState(
      null,
      "",
      "/hu/rendeles-fizetese/t.s?payment_intent=pi_1&redirect_status=failed",
    )
    megjelenit()
    await waitFor(() =>
      expect(screen.getByTestId("link-elutasitva")).toBeTruthy(),
    )
    expect(fejezdBeLinkFizetest).not.toHaveBeenCalled()
  })

  it("amig a mezo nincs kitoltve, a gomb nem nyomhato", async () => {
    mezoAllapot.complete = false
    megjelenit()
    await new Promise((r) => setTimeout(r, 0))
    expect(gomb().hasAttribute("disabled")).toBe(true)
  })
})
