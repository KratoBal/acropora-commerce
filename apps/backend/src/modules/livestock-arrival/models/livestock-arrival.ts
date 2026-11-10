import { model } from "@medusajs/framework/utils"

/**
 * THE LIVE ANIMALS ON THEIR WAY, as the Acropora OS publishes them (V2.6, card f4e4832b, S4a). The OS is the owner and
 * the only writer: it sends the whole set (`PUT /admin/livestock-arrivals`), and what left it leaves here. Only what a
 * buyer may see comes here: an arrival a customer may register for (the OS's `preorderable`), not arrived and not
 * cancelled, its name, kind, expected day and state, and the product it is bound to when it is. The quantity and the
 * OS's note never come (they are internal).
 *
 *   os_id              the OS arrival's id; the key of the replace.
 *   kind               FISH, INVERTEBRATE or CORAL.
 *   label              what the buyer reads: a species ("Amphiprion ocellaris"), a group ("Zoanthus") or a piece's name.
 *   expected_on        the expected day, "YYYY-MM-DD" (a day, Budapest's, not a moment).
 *   status             ORDERED or IN_TRANSIT.
 *   medusa_product_id  the product it is bound to, or null for an arrival of a species or a group.
 */
export const LivestockArrival = model
  .define("livestock_arrival", {
    id: model.id({ prefix: "lvarr" }).primaryKey(),
    os_id: model.text(),
    kind: model.text(),
    label: model.text(),
    expected_on: model.text(),
    status: model.text(),
    medusa_product_id: model.text().nullable(),
  })
  .indexes([{ on: ["os_id"], unique: true, where: "deleted_at IS NULL" }])

export default LivestockArrival
