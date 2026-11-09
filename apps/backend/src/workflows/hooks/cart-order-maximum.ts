import {
  addToCartWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows"

import { holdOnAdd } from "../utils/cart-hold"
import { assertOrderMaximum } from "../utils/order-maximum"

/**
 * THE ORDER MAXIMUM ON EVERY WAY INTO THE CART (card 6994c9a3). The two
 * store routes that change a line's quantity both run through these
 * workflows; a hook refuses before anything is written. A workflow hook takes
 * one handler, and neither of these had one.
 */
addToCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  const added = (input.items ?? []).flatMap((item: any) =>
    item?.variant_id
      ? [
          {
            kind: "add" as const,
            variant_id: item.variant_id as string,
            quantity: Number(item.quantity),
          },
        ]
      : []
  )
  await assertOrderMaximum(container, cart.id, added)
  // V2.3 (card 52024fc0): a unique piece is held for this cart, or refused when
  // another cart holds it. After the maximum, so a refused line makes no hold.
  await holdOnAdd(
    container,
    cart.id,
    added.map((change) => change.variant_id)
  )
})

updateLineItemInCartWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    const quantity = Number(input.update?.quantity)
    if (!Number.isFinite(quantity)) return
    await assertOrderMaximum(container, cart.id, [
      { kind: "set", line_id: input.item_id, quantity },
    ])
  }
)
