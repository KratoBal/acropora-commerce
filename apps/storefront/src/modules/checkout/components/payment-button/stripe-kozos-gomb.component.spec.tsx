import { HttpTypes } from "@medusajs/types"
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

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => stripe,
  useElements: () => elements,
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  unstable_rethrow: () => {},
}))
vi.mock("@lib/data/cart", () => ({
  placeOrder: vi.fn(async () => {
    sorrend.log.push("placeOrder")
    return { ok: true }
  }),
}))
vi.mock("@lib/data/stripe", () => ({
  inditsStripeKozosFizetest: vi.fn(async () => {
    sorrend.log.push("stripe-start")
    return { ok: true, titok: "pi_joint_secret" }
  }),
  stripeVisszarendezes: vi.fn(async () => {
    sorrend.log.push("stripe-rejoin")
  }),
}))

import {
  inditsStripeKozosFizetest,
  stripeVisszarendezes,
} from "@lib/data/stripe"
import { placeOrder } from "@lib/data/cart"
import PaymentButton from "./index"

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  sorrend.log.length = 0
})

const kosar = {
  id: "cart-1",
  email: "vevo@example.test",
  shipping_address: { id: "a1", country_code: "hu" },
  billing_address: {
    id: "a2",
    country_code: "hu",
    first_name: "Teszt",
    last_name: "Elek",
  },
  shipping_methods: [{ id: "sm-1" }],
  payment_collection: { payment_sessions: [] },
} as unknown as HttpTypes.StoreCart

const lead = () => {
  render(<PaymentButton cart={kosar} stripeKozos data-testid="submit" />)
  fireEvent.click(screen.getByTestId("submit"))
}

/**
 * A VEGYES KOSÁR STRIPE-FIZETÉSE A LEADÁSKOR (Balázs 2026-10-01, 1-es út).
 * MI PIROSÍT: a háttér bontása a kártyamező ellenőrzése ELŐTT; a megerősítés
 * nem a közös intent titkával; a leadás a zárolás nélkül; egy elutasított
 * kártya után a kosár bontva és a zárolás rajta marad.
 */
describe("StripeKozosGomb", () => {
  it("ellenőriz, bont és közös intentet kér, a titkával erősít meg, aztán lead", async () => {
    elements.submit.mockImplementation(async () => {
      sorrend.log.push("submit")
      return {}
    })
    stripe.confirmPayment.mockImplementation(async () => {
      sorrend.log.push("confirm")
      return { paymentIntent: { status: "requires_capture" } }
    })
    lead()
    await waitFor(() => expect(placeOrder).toHaveBeenCalled())
    expect(sorrend.log).toEqual([
      "submit",
      "stripe-start",
      "confirm",
      "placeOrder",
    ])
    expect(stripe.confirmPayment.mock.calls[0][0]).toMatchObject({
      elements,
      clientSecret: "pi_joint_secret",
      redirect: "if_required",
    })
  })

  it("elutasított kártya: a kosár visszarendeződik, a hiba látszik, leadás nincs", async () => {
    elements.submit.mockResolvedValue({})
    stripe.confirmPayment.mockResolvedValue({
      error: {
        message: "A kártyát elutasították.",
        payment_intent: { status: "requires_payment_method" },
      },
    })
    lead()
    expect(
      await screen.findByText("A kártyát elutasították."),
    ).toBeInTheDocument()
    expect(stripeVisszarendezes).toHaveBeenCalledWith("cart-1")
    expect(placeOrder).not.toHaveBeenCalled()
  })

  it("a kártyamező hibájánál a háttérhez sem nyúl", async () => {
    elements.submit.mockResolvedValue({
      error: { message: "Hiányzó kártyaszám." },
    })
    lead()
    expect(await screen.findByText("Hiányzó kártyaszám.")).toBeInTheDocument()
    expect(inditsStripeKozosFizetest).not.toHaveBeenCalled()
    expect(stripe.confirmPayment).not.toHaveBeenCalled()
  })

  it("ha az indítás nem sikerül, kártyát sem erősít meg", async () => {
    elements.submit.mockResolvedValue({})
    vi.mocked(inditsStripeKozosFizetest).mockResolvedValueOnce({
      ok: false,
      uzenet: "Most nem sikerült.",
    })
    lead()
    expect(await screen.findByText("Most nem sikerült.")).toBeInTheDocument()
    expect(stripe.confirmPayment).not.toHaveBeenCalled()
  })

  /*
    A REDESIGN ALLAPOTAI (a keretek 477:*). MI PIROSIT: a bank elutasitasa nem
    a rogzitett mondattal es nem "Próbáld újra" gombbal jelenik meg; a Stripe
    sajat validacios hibaja meg egyszer kiirodik; a mezo nem zarolodik a
    fizetes alatt; egy dupla kattintas masodik fizetest indit.
  */
  it("a bank elutasítása: a rögzített mondat, a gomb „Próbáld újra”, a kosár visszarendeződik", async () => {
    elements.submit.mockResolvedValue({})
    stripe.confirmPayment.mockResolvedValue({
      error: {
        type: "card_error",
        message: "Your card was declined.",
        payment_intent: { status: "requires_payment_method" },
      },
    })
    lead()
    expect(
      await screen.findByText(
        "A kártyás fizetés nem sikerült. Próbáld újra vagy válassz másik fizetési módot.",
      ),
    ).toBeInTheDocument()
    expect(screen.getByTestId("submit")).toHaveTextContent("Próbáld újra")
    expect(screen.queryByText("Your card was declined.")).toBeNull()
    expect(stripeVisszarendezes).toHaveBeenCalledWith("cart-1")
  })

  it("a Stripe validációs hibáját nem írja ki még egyszer, és a háttérhez sem nyúl", async () => {
    elements.submit.mockResolvedValue({
      error: { type: "validation_error", message: "Hibás kártyaszám." },
    })
    lead()
    await waitFor(() =>
      expect(screen.getByTestId("submit")).toHaveTextContent(
        "Rendelés leadása",
      ),
    )
    expect(screen.queryByText("Hibás kártyaszám.")).toBeNull()
    expect(inditsStripeKozosFizetest).not.toHaveBeenCalled()
  })

  it("fizetés közben a mező zárolva, a gomb „Feldolgozás…”, és egy dupla kattintás egy fizetés", async () => {
    let enged: (v: unknown) => void = () => {}
    elements.submit.mockResolvedValue({})
    stripe.confirmPayment.mockImplementation(
      () => new Promise((r) => (enged = r)),
    )
    render(<PaymentButton cart={kosar} stripeKozos data-testid="submit" />)
    const gomb = screen.getByTestId("submit")
    fireEvent.click(gomb)
    fireEvent.click(gomb)
    await waitFor(() => expect(stripe.confirmPayment).toHaveBeenCalled())
    expect(gomb).toHaveTextContent("Feldolgozás…")
    expect(mezo.update).toHaveBeenCalledWith({ readOnly: true })
    enged({ paymentIntent: { status: "requires_capture" } })
    await waitFor(() => expect(placeOrder).toHaveBeenCalled())
    expect(inditsStripeKozosFizetest).toHaveBeenCalledTimes(1)
    expect(stripe.confirmPayment).toHaveBeenCalledTimes(1)
    expect(mezo.update).toHaveBeenLastCalledWith({ readOnly: false })
  })
})
