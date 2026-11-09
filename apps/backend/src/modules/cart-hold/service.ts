import { MedusaService } from "@medusajs/framework/utils"

import CartHold from "./models/cart-hold"

/**
 * The holds' table and nothing else. The decision is pure (`policy.ts`) and the Medusa wiring, with the lock that
 * makes read-decide-write one step across instances, is in `workflows/utils/cart-hold.ts`.
 */
class CartHoldModuleService extends MedusaService({ CartHold }) {}

export default CartHoldModuleService
