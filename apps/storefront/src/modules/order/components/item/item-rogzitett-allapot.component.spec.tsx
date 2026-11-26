import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const kapott: { price: unknown[]; unit: unknown[] } = { price: [], unit: [] }

vi.mock("@modules/common/components/line-item-price", () => ({
  default: (props: unknown) => {
    kapott.price.push(props)
    return null
  },
}))
vi.mock("@modules/common/components/line-item-unit-price", () => ({
  default: (props: unknown) => {
    kapott.unit.push(props)
    return null
  },
}))
vi.mock("@modules/products/components/thumbnail", () => ({
  default: () => null,
}))

import Item from "./index"

afterEach(() => {
  cleanup()
  kapott.price = []
  kapott.unit = []
})

/**
 * A RENDELES SORA A VASARLASKORI ALLAPOTOT KAPJA (card 90c54873, acrobot 62358): a visszaigazolas es a rendeles-elozmeny bizonylat. MI PIROSIT:
 * ha a rendeles sora az elo valtozat-metaadatbol szamolo (kosar-) alakban kapja az ar-komponenseket, akkor egy akcio, ami a vasarlas utan
 * indul vagy er veget, utolag atirja a bizonylatot.
 */
describe("a rendelés sora", () => {
  it("mindkét ár-komponensnek a vásárláskori (rögzített) alakot kéri", () => {
    render(
      <table>
        <tbody>
          <Item
            item={
              {
                id: "i1",
                quantity: 1,
                product_title: "Próba",
                thumbnail: null,
                variant: { id: "v1", title: "Kicsi" },
              } as never
            }
            currencyCode="huf"
          />
        </tbody>
      </table>,
    )
    expect(kapott.price).toHaveLength(1)
    expect(kapott.unit).toHaveLength(1)
    expect((kapott.price[0] as { reduction?: string }).reduction).toBe(
      "purchase",
    )
    expect((kapott.unit[0] as { reduction?: string }).reduction).toBe(
      "purchase",
    )
  })
})
