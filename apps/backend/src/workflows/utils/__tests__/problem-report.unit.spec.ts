import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"

import { ORDER_PROBLEM_REPORT_MODULE } from "../../../modules/order-problem-report"
import {
  accessibleOrder,
  createReport,
  listReportsForOs,
  markPulled,
  photoFolderOf,
  storePhoto,
  unattachedPhotoCount,
} from "../problem-report/report"

/*
  WHAT TURNS THIS RED (V1.2, the Medusa side). A customer reaching an order with the wrong address, or another
  customer's items or photos in a report; a photo a report already took taken twice; more than five photos; a
  photo stored under a name the browser chose, or in a folder derivable from the order id; a report that reaches
  the OS without its photos; a second `pulled` changing anything.
*/
type Row = Record<string, any>

function fakeContainer(orders: Row[]) {
  const reports: Row[] = []
  const images: Row[] = []
  const files: Row[] = []
  let seq = 0
  const matches = (row: Row, filter: Row) =>
    Object.entries(filter).every(([key, value]) =>
      Array.isArray(value) ? value.includes(row[key]) : value === null ? row[key] == null : row[key] === value,
    )
  const service = {
    createOrderProblemImages: async (data: Row) => {
      const row = { id: `img_${++seq}`, ...data }
      images.push(row)
      return row
    },
    listOrderProblemImages: async (filter: Row) => images.filter((row) => matches(row, filter)),
    updateOrderProblemImages: async (data: Row) =>
      Object.assign(
        images.find((row) => row.id === data.id)!,
        data,
      ),
    createOrderProblemReports: async (data: Row) => {
      const row = { id: `rep_${++seq}`, created_at: new Date("2026-11-04T10:00:00Z"), pulled_at: null, ...data }
      reports.push(row)
      return row
    },
    listOrderProblemReports: async (filter: Row, config?: Row) =>
      reports.filter((row) => matches(row, filter)).slice(0, config?.take ?? 1000),
    updateOrderProblemReports: async (data: Row) =>
      Object.assign(
        reports.find((row) => row.id === data.id)!,
        data,
      ),
  }
  const container = {
    resolve: (key: string) => {
      if (key === ContainerRegistrationKeys.QUERY)
        return {
          graph: async (q: { filters: { display_id: number } }) => ({
            data: orders.filter((order) => order.display_id === q.filters.display_id),
          }),
        }
      if (key === Modules.FILE)
        return {
          createFiles: async (data: Row) => {
            files.push(data)
            return { id: data.filename, url: `https://shop.example/static/${data.filename}` }
          },
        }
      if (key === ORDER_PROBLEM_REPORT_MODULE) return service
      throw new Error(`unexpected resolve ${key}`)
    },
  } as never
  return { container, reports, images, files }
}

const ORDER = { id: "order_1", display_id: 1042, email: "Vevo@Example.hu", items: [{ id: "item_1" }, { id: "item_2" }] }
const OTHER = { id: "order_2", display_id: 1043, email: "mas@example.hu", items: [{ id: "item_9" }] }
const input = {
  kind: "item_damaged" as const,
  itemIds: ["item_1"],
  receivedAt: null,
  description: "Törött",
  phone: null,
  photoIds: [] as string[],
}

describe("accessibleOrder", () => {
  it("opens with the right pair, whatever the address's case and spaces, and lists the line ids", async () => {
    const { container } = fakeContainer([ORDER])
    expect(await accessibleOrder(container, 1042, "  vevo@example.hu ")).toEqual({
      id: "order_1",
      itemIds: ["item_1", "item_2"],
    })
  })

  it("is null for a wrong address, an unknown number, a malformed number and an empty address", async () => {
    const { container } = fakeContainer([ORDER])
    expect(await accessibleOrder(container, 1042, "mas@example.hu")).toBeNull()
    expect(await accessibleOrder(container, 9999, "vevo@example.hu")).toBeNull()
    expect(await accessibleOrder(container, 0, "vevo@example.hu")).toBeNull()
    expect(await accessibleOrder(container, 1.5, "vevo@example.hu")).toBeNull()
    expect(await accessibleOrder(container, 1042, "   ")).toBeNull()
  })

  it("an order with no address on file never opens", async () => {
    const { container } = fakeContainer([{ ...ORDER, email: null }])
    expect(await accessibleOrder(container, 1042, "vevo@example.hu")).toBeNull()
  })
})

describe("storePhoto", () => {
  it("stores under a server-chosen name in a per-order folder that is not the order id, and records the image for the order", async () => {
    const { container, files, images } = fakeContainer([ORDER])
    const stored = await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff, 1]), {
      ext: "jpg",
      mime: "image/jpeg",
    })
    expect(stored.id).toBe("img_1")
    expect(files).toHaveLength(1)
    expect(files[0].filename).toMatch(/^problem-reports\/[0-9a-f]{16}\/[0-9a-f]{32}\.jpg$/)
    expect(files[0].filename).not.toContain("order_1")
    expect(files[0].filename.startsWith(photoFolderOf("order_1") + "/")).toBe(true)
    expect(files[0].mimeType).toBe("image/jpeg")
    expect(files[0].access).toBe("private")
    expect(Buffer.from(files[0].content, "base64")[0]).toBe(0xff)
    expect(images[0]).toMatchObject({ order_id: "order_1", report_id: null, mime_type: "image/jpeg", size_bytes: 4 })
  })

  it("two orders have two folders, and the same order always the same one", () => {
    expect(photoFolderOf("order_1")).toBe(photoFolderOf("order_1"))
    expect(photoFolderOf("order_1")).not.toBe(photoFolderOf("order_2"))
  })

  it("counts the uploads no report has taken", async () => {
    const { container } = fakeContainer([ORDER])
    await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff]), { ext: "jpg", mime: "image/jpeg" })
    await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff]), { ext: "jpg", mime: "image/jpeg" })
    expect(await unattachedPhotoCount(container, "order_1")).toBe(2)
    expect(await unattachedPhotoCount(container, "order_2")).toBe(0)
  })
})

describe("createReport", () => {
  const access = { id: "order_1", itemIds: ["item_1", "item_2"] }

  it("creates the report and links the order's own photos to it", async () => {
    const { container, images, reports } = fakeContainer([ORDER])
    const photo = await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff]), {
      ext: "jpg",
      mime: "image/jpeg",
    })
    const result = await createReport(container, access, {
      ...input,
      itemIds: ["item_1", "item_1", "item_2"],
      photoIds: [photo.id, photo.id],
    })
    expect(result).toMatchObject({ status: "created", createdAt: "2026-11-04T10:00:00.000Z" })
    expect(reports[0]).toMatchObject({
      order_id: "order_1",
      kind: "item_damaged",
      item_ids: ["item_1", "item_2"],
      status: "new",
    })
    expect(images[0].report_id).toBe(reports[0].id)
  })

  it("refuses an item that is not this order's line, and writes nothing", async () => {
    const { container, reports } = fakeContainer([ORDER, OTHER])
    expect(await createReport(container, access, { ...input, itemIds: ["item_9"] })).toEqual({ status: "bad_items" })
    expect(await createReport(container, access, { ...input, itemIds: [] })).toEqual({ status: "bad_items" })
    expect(reports).toHaveLength(0)
  })

  it("refuses another order's photo and a photo a report already took", async () => {
    const { container, reports } = fakeContainer([ORDER, OTHER])
    const foreign = await storePhoto(container, "order_2", Buffer.from([0xff, 0xd8, 0xff]), {
      ext: "jpg",
      mime: "image/jpeg",
    })
    expect(await createReport(container, access, { ...input, photoIds: [foreign.id] })).toEqual({
      status: "bad_photos",
    })
    const own = await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff]), {
      ext: "jpg",
      mime: "image/jpeg",
    })
    expect((await createReport(container, access, { ...input, photoIds: [own.id] })).status).toBe("created")
    expect(await createReport(container, access, { ...input, photoIds: [own.id] })).toEqual({ status: "bad_photos" })
    expect(await createReport(container, access, { ...input, photoIds: ["img_nem_letezik"] })).toEqual({
      status: "bad_photos",
    })
    expect(reports).toHaveLength(1)
  })

  it("refuses more than five photos", async () => {
    const { container, reports } = fakeContainer([ORDER])
    const ids: string[] = []
    for (let i = 0; i < 6; i++)
      ids.push(
        (await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff]), { ext: "jpg", mime: "image/jpeg" }))
          .id,
      )
    expect(await createReport(container, access, { ...input, photoIds: ids })).toEqual({ status: "bad_photos" })
    expect((await createReport(container, access, { ...input, photoIds: ids.slice(0, 5) })).status).toBe("created")
    expect(reports).toHaveLength(1)
  })
})

describe("the OS side", () => {
  it("lists the reports with their photos, the status filter applied", async () => {
    const { container } = fakeContainer([ORDER])
    const photo = await storePhoto(container, "order_1", Buffer.from([0xff, 0xd8, 0xff]), {
      ext: "jpg",
      mime: "image/jpeg",
    })
    await createReport(
      container,
      { id: "order_1", itemIds: ["item_1"] },
      { ...input, photoIds: [photo.id], phone: "+36 30 1" },
    )
    const list = await listReportsForOs(container, { status: "new", limit: 10 })
    expect(list).toHaveLength(1)
    expect(list[0]).toMatchObject({
      order_id: "order_1",
      kind: "item_damaged",
      item_ids: ["item_1"],
      phone: "+36 30 1",
      status: "new",
      pulled_at: null,
    })
    expect(list[0].photos).toHaveLength(1)
    expect(list[0].photos[0]).toMatchObject({ mime_type: "image/jpeg", size_bytes: 3 })
    expect(await listReportsForOs(container, { status: "pulled", limit: 10 })).toEqual([])
  })

  it("marks a report pulled once; a second call changes nothing; an unknown id is not_found", async () => {
    const { container, reports } = fakeContainer([ORDER])
    await createReport(container, { id: "order_1", itemIds: ["item_1"] }, input)
    const id = reports[0].id
    expect(await markPulled(container, id, new Date("2026-11-04T11:00:00Z"))).toBe("pulled")
    const firstPulledAt = reports[0].pulled_at
    expect(await markPulled(container, id, new Date("2026-11-04T12:00:00Z"))).toBe("pulled")
    expect(reports[0].pulled_at).toBe(firstPulledAt)
    expect(await markPulled(container, "rep_nincs", new Date())).toBe("not_found")
    expect(await listReportsForOs(container, { status: "new", limit: 10 })).toEqual([])
    expect(await listReportsForOs(container, { status: "pulled", limit: 10 })).toHaveLength(1)
  })
})
