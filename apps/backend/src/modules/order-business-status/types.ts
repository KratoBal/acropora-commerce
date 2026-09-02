export const ORDER_BUSINESS_STATUSES = [
  "pending_processing",
  "stocking",
  "out_for_delivery",
  "ready_for_pickup",
  "closed",
  "closed_unsuccessfully",
] as const

export type OrderBusinessStatus = (typeof ORDER_BUSINESS_STATUSES)[number]

export const ORDER_BUSINESS_STATUS_LABELS: Record<
  OrderBusinessStatus,
  string
> = {
  pending_processing: "Feldolgozásra vár",
  stocking: "Készletezés alatt",
  out_for_delivery: "Kiszállítás",
  ready_for_pickup: "Átvehető",
  closed: "Megrendelés lezárva",
  closed_unsuccessfully: "Sikertelenül lezárt rendelés",
}

export type OrderBusinessStatusActor = "admin" | "carrier" | "system"

export type OrderBusinessStatusSource =
  | "order_created"
  | "admin"
  | "carrier"

export type OrderBusinessStatusTransition = {
  from: OrderBusinessStatus | null
  to: OrderBusinessStatus
  actor: OrderBusinessStatusActor
  source: OrderBusinessStatusSource
}
