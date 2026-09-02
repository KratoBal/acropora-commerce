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
  pending_processing: [
    { to: "stocking", actors: ["admin"] },
    { to: "closed_unsuccessfully", actors: ["admin"] },
  ],
  stocking: [
    { to: "out_for_delivery", actors: ["admin"] },
    { to: "ready_for_pickup", actors: ["admin"] },
    { to: "closed_unsuccessfully", actors: ["admin"] },
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

  if (!allowed.actors.includes(actor)) {
    throw new MedusaError(
      MedusaError.Types.UNAUTHORIZED,
      `${actor} cannot transition ${from} to ${to}`,
    )
  }
}
