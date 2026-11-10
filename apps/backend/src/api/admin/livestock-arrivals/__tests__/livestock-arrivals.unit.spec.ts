import LivestockArrivalModuleService from "../../../../modules/livestock-arrival/service"
import { storeArrivals } from "../../../store/livestock-arrivals/helpers"
import { AdminPutLivestockArrivals } from "../validators"

/*
  THE LIVE ANIMALS ON THEIR WAY (V2.6 S4a, card f4e4832b). WHAT TURNS THIS RED: a quantity or a note accepted into the public
  table; an os_id twice in one set; a row the OS stopped sending kept, or a sent row duplicated instead of updated; the
  storefront's list out of day order; a species key computed from anything but the label, or a group named a species; the
  buyable question asked more than once per species.
*/
const arrival = (over: Record<string, unknown> = {}) => ({
  os_id: "os-1",
  kind: "FISH",
  label: "Amphiprion ocellaris",
  expected_on: "2026-11-20",
  status: "ORDERED",
  medusa_product_id: null,
  ...over,
})

describe("PUT /admin/livestock-arrivals: the body", () => {
  it("LA-BODY: the whole set, strict: no quantity, no note, no unknown kind, no os_id twice, a day not a moment", () => {
    const ok = (arrivals: unknown[]) => AdminPutLivestockArrivals.safeParse({ arrivals }).success
    expect(ok([arrival(), arrival({ os_id: "os-2", medusa_product_id: "prod_1", status: "IN_TRANSIT" })])).toBe(true)
    expect(ok([])).toBe(true)
    expect(ok([arrival({ quantity: 3 })])).toBe(false)
    expect(ok([arrival({ note: "belso" })])).toBe(false)
    expect(ok([arrival({ kind: "PLANT" })])).toBe(false)
    expect(ok([arrival({ status: "ARRIVED" })])).toBe(false)
    expect(ok([arrival({ expected_on: "2026-11-20T10:00:00Z" })])).toBe(false)
    expect(ok([arrival(), arrival()])).toBe(false)
    expect(AdminPutLivestockArrivals.safeParse({ arrivals: [], extra: 1 }).success).toBe(false)
  })
})

describe("the module's replace", () => {
  it("LA-REPLACE: a row no longer sent goes, a sent one is updated by os_id, a new one is created", async () => {
    let rows = [
      { id: "lvarr_1", ...arrival({ os_id: "kept", label: "Régi név" }) },
      { id: "lvarr_2", ...arrival({ os_id: "gone" }) },
    ]
    const store = {
      listLivestockArrivals: jest.fn(async () => rows.map((r) => ({ ...r }))),
      deleteLivestockArrivals: jest.fn(async (ids: string[]) => {
        rows = rows.filter((r) => !ids.includes(r.id))
      }),
      createLivestockArrivals: jest.fn(async (data: typeof rows) => {
        for (const d of data) rows.push({ ...d, id: `lvarr_${rows.length + 10}` })
      }),
      updateLivestockArrivals: jest.fn(async (data: typeof rows) => {
        for (const d of data) Object.assign(rows.find((r) => r.id === d.id)!, d)
      }),
    }
    const service = Object.assign(store, {
      replaceAll: LivestockArrivalModuleService.prototype.replaceAll,
    }) as unknown as LivestockArrivalModuleService
    const out = await service.replaceAll([
      arrival({ os_id: "kept", label: "Új név" }) as never,
      arrival({ os_id: "new", label: "Zoanthus" }) as never,
    ])
    expect(out).toEqual({ created: 1, updated: 1, deleted: 1 })
    expect(rows.map((r) => [r.os_id, r.label]).sort()).toEqual([
      ["kept", "Új név"],
      ["new", "Zoanthus"],
    ])
    expect(rows.find((r) => r.os_id === "kept")!.id).toBe("lvarr_1")
  })
})

describe("GET /store/livestock-arrivals: the list", () => {
  it("LA-STORE: by day then name, the commerce id, the species from the label (a group has none), buyable asked once per species", async () => {
    const buyable = jest.fn(async (key: string) => key === "amphiprion ocellaris")
    const list = await storeArrivals(
      [
        { id: "a3", kind: "CORAL", label: "Zoanthus", expected_on: "2026-11-20", status: "ORDERED", medusa_product_id: null },
        { id: "a1", kind: "FISH", label: "Amphiprion ocellaris", expected_on: "2026-11-20", status: "IN_TRANSIT", medusa_product_id: null },
        { id: "a2", kind: "FISH", label: "Amphiprion ocellaris", expected_on: "2026-11-18", status: "ORDERED", medusa_product_id: "prod_9" },
        { id: "a4", kind: "CORAL", label: "Acropora sp. kék", expected_on: "2026-12-01", status: "ORDERED", medusa_product_id: null },
      ],
      buyable
    )
    expect(list.map((a) => [a.id, a.expected_on, a.species_key, a.species_buyable, a.medusa_product_id])).toEqual([
      ["a2", "2026-11-18", "amphiprion ocellaris", true, "prod_9"],
      ["a1", "2026-11-20", "amphiprion ocellaris", true, null],
      ["a3", "2026-11-20", null, false, null],
      ["a4", "2026-12-01", null, false, null],
    ])
    expect(buyable).toHaveBeenCalledTimes(1)
  })
})
