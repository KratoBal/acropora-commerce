import { MedusaError } from "@medusajs/framework/utils"

import {
  OrderBusinessStatus,
  OrderBusinessStatusActor,
  OrderBusinessStatusSource,
} from "./types"

type AllowedTransition = {
  to: OrderBusinessStatus
  actors: OrderBusinessStatusActor[]
}

const transitions: Record<OrderBusinessStatus, AllowedTransition[]> = {
  // `system` closes only an order whose payment link ran out (source
  // `payment_deadline`, checked below), and only before it left the shop
  pending_processing: [
    { to: "confirmed", actors: ["admin"] },
    // The direct step stays: whether Visszaigazolva is mandatory is not decided.
    { to: "stocking", actors: ["admin"] },
    { to: "closed_unsuccessfully", actors: ["admin", "system"] },
  ],
  confirmed: [
    { to: "stocking", actors: ["admin"] },
    { to: "closed_unsuccessfully", actors: ["admin", "system"] },
  ],
  stocking: [
    { to: "out_for_delivery", actors: ["admin"] },
    { to: "ready_for_pickup", actors: ["admin"] },
    { to: "closed_unsuccessfully", actors: ["admin", "system"] },
  ],
  out_for_delivery: [
    { to: "closed", actors: ["carrier", "admin"] },
    { to: "closed_unsuccessfully", actors: ["carrier", "admin"] },
  ],
  ready_for_pickup: [
    { to: "closed", actors: ["admin"] },
    { to: "closed_unsuccessfully", actors: ["admin"] },
  ],
  closed: [],
  closed_unsuccessfully: [{ to: "stocking", actors: ["admin"] }],
}

/**
 * Where an order may go next from `from`, for `actor`, in the table's order.
 * The OS offers only these in its "Státusz módosítása" list.
 */
export const nextBusinessStatuses = (
  from: OrderBusinessStatus,
  actor: OrderBusinessStatusActor,
): OrderBusinessStatus[] =>
  transitions[from]
    .filter((transition) => transition.actors.includes(actor))
    .map((transition) => transition.to)

export const assertBusinessStatusTransition = ({
  from,
  to,
  actor,
  source,
}: {
  from: OrderBusinessStatus | null
  to: OrderBusinessStatus
  actor: OrderBusinessStatusActor
  source: OrderBusinessStatusSource
}): void => {
  if (from === null) {
    if (
      to === "pending_processing" &&
      actor === "system" &&
      source === "order_created"
    ) {
      return
    }

    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Only a newly created order may enter Feldolgozásra vár",
    )
  }

  const allowed = transitions[from].find((transition) => transition.to === to)

  if (!allowed) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `${from} cannot transition to ${to}`,
    )
  }

  // the system's only close is the payment deadline's (plan 2.5, decision 2)
  if (actor === "system" && source !== "payment_deadline") {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      `system cannot transition ${from} to ${to} from ${source}`,
    )
  }

  if (!allowed.actors.includes(actor)) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      `${actor} cannot transition ${from} to ${to}`,
    )
  }
}
