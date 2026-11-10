import { MedusaService } from "@medusajs/framework/utils"

import LivestockArrival from "./models/livestock-arrival"

export type LivestockArrivalInput = {
  os_id: string
  kind: string
  label: string
  expected_on: string
  status: string
  medusa_product_id: string | null
}

export type LivestockArrivalRow = LivestockArrivalInput & { id: string }

class LivestockArrivalModuleService extends MedusaService({ LivestockArrival }) {
  /**
   * The OS's whole set in place of the stored one: a row it no longer sends goes, one it sends is created or updated by
   * `os_id`. Not one transaction: a write that stops halfway is put right by the OS's next send (it sends the whole set
   * every time), and a buyer meanwhile sees a list that is at most one send old.
   */
  async replaceAll(arrivals: LivestockArrivalInput[]): Promise<{ created: number; updated: number; deleted: number }> {
    const stored = (await this.listLivestockArrivals({}, { take: null })) as unknown as LivestockArrivalRow[]
    const byOsId = new Map(stored.map((row) => [row.os_id, row]))
    const sent = new Set(arrivals.map((a) => a.os_id))
    const gone = stored.filter((row) => !sent.has(row.os_id)).map((row) => row.id)
    if (gone.length) await this.deleteLivestockArrivals(gone)
    const create = arrivals.filter((a) => !byOsId.has(a.os_id))
    if (create.length) await this.createLivestockArrivals(create)
    const update = arrivals
      .filter((a) => byOsId.has(a.os_id))
      .map((a) => ({ id: byOsId.get(a.os_id)!.id, ...a }))
    if (update.length) await this.updateLivestockArrivals(update)
    return { created: create.length, updated: update.length, deleted: gone.length }
  }
}

export default LivestockArrivalModuleService
