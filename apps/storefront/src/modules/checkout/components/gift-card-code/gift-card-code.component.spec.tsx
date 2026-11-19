import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const applyGiftCard = vi.fn()
const removeGiftCard = vi.fn()

vi.mock("@lib/data/cart", () => ({
  applyGiftCard: (...args: unknown[]) => applyGiftCard(...args),
  removeGiftCard: (...args: unknown[]) => removeGiftCard(...args),
}))

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

import GiftCardCode from "./index"

/**
 * AZ AJÁNDÉKKÁRTYA MEZŐJE (495c0007).
 *
 * MI PIROSÍT: a beírt kód nem a webshop-hívásba megy; a hiba (a művelet válaszából) nem jelenik meg; a levonás után a
 * kártya sora nem mutatja a jóváírást vagy nem vehető le; egy másik jóváírás ajándékkártyának látszik.
 */
afterEach(cleanup)
beforeEach(() => {
  applyGiftCard.mockReset()
  removeGiftCard.mockReset()
})

const kosar = (credit_lines: unknown[] = []) =>
  ({ id: "cart-1", currency_code: "huf", total: 6700, credit_lines }) as never

async function kodotKuld(kod: string) {
  render(<GiftCardCode cart={kosar()} />)
  screen.getByTestId("add-gift-card-button").click()
  const mezo = await screen.findByTestId("gift-card-input")
  ;(mezo as HTMLInputElement).value = kod
  ;(mezo.closest("form") as HTMLFormElement).requestSubmit()
}

describe("GiftCardCode", () => {
  it("a beírt kód a webshop-hívásba megy", async () => {
    applyGiftCard.mockResolvedValue({ ok: true })
    await kodotKuld(" 7K3M-QX9P-2ZRT-H4BW ")
    await waitFor(() =>
      expect(applyGiftCard).toHaveBeenCalledWith("7K3M-QX9P-2ZRT-H4BW"),
    )
  })

  it("a művelet hibáját kiírja", async () => {
    applyGiftCard.mockResolvedValue({
      ok: false,
      uzenet: "Ez az ajándékkártya nem használható.",
    })
    await kodotKuld("ROSSZ-KOD")
    expect(
      await screen.findByText("Ez az ajándékkártya nem használható."),
    ).toBeTruthy()
  })

  it("a beváltott kártya sora a jóváírást mutatja, és levehető", async () => {
    removeGiftCard.mockResolvedValue({ ok: true })
    render(
      <GiftCardCode
        cart={kosar([
          {
            amount: 6000,
            reference: "gift_card",
            metadata: { code_last4: "H4BW" },
          },
        ])}
      />,
    )
    const sor = screen.getByTestId("gift-card-row").textContent ?? ""
    expect(sor).toContain("…H4BW")
    expect(sor).toMatch(/6\s?000/)
    expect(screen.queryByTestId("add-gift-card-button")).toBeNull()
    screen.getByTestId("remove-gift-card-button").click()
    await waitFor(() => expect(removeGiftCard).toHaveBeenCalled())
  })

  it("részleges fedezésnél megmondja, hogy a maradékhoz újra kell fizetési módot választani; teljesnél nem", () => {
    const sor = {
      amount: 6000,
      reference: "gift_card",
      metadata: { code_last4: "H4BW" },
    }
    const { unmount } = render(
      <GiftCardCode
        cart={
          {
            id: "cart-1",
            currency_code: "huf",
            total: 6700,
            credit_lines: [sor],
          } as never
        }
      />,
    )
    expect(screen.getByTestId("gift-card-rest-note")).toBeTruthy()
    unmount()
    render(
      <GiftCardCode
        cart={
          {
            id: "cart-1",
            currency_code: "huf",
            total: 0,
            credit_lines: [sor],
          } as never
        }
      />,
    )
    expect(screen.queryByTestId("gift-card-rest-note")).toBeNull()
  })

  it("egy másik jóváírás nem ajándékkártya: a mező beváltásra kész", () => {
    render(
      <GiftCardCode cart={kosar([{ amount: 100, reference: "loyalty" }])} />,
    )
    expect(screen.queryByTestId("gift-card-row")).toBeNull()
    expect(screen.getByTestId("add-gift-card-button")).toBeTruthy()
  })
})
