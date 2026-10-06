import {
  addToCartWorkflow,
  updateLineItemInCartWorkflow,
} from "@medusajs/medusa/core-flows"

import { assertOrderMaximum } from "../utils/order-maximum"

/**
 * THE ORDER MAXIMUM ON EVERY WAY INTO THE CART (card 6994c9a3). The two
 * store routes that change a line's quantity both run through these
 * workflows; a hook refuses before anything is written. A workflow hook takes
 * one handler, and neither of these had one.
 */
addToCartWorkflow.hooks.validate(async ({ input, cart }, { container }) => {
  await assertOrderMaximum(
    container,
    cart.id,
    (input.items ?? []).flatMap((item: any) =>
      item?.variant_id
        ? [
            {
              kind: "add" as const,
              variant_id: item.variant_id,
              quantity: Number(item.quantity),
            },
          ]
        : []
    )
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
