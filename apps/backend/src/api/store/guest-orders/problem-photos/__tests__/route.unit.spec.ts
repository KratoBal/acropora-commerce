const accessibleOrder = jest.fn()
const storePhoto = jest.fn()
const unattachedPhotoCount = jest.fn()
jest.mock("../../../../../workflows/utils/problem-report/report", () => ({
  accessibleOrder: (...args: unknown[]) => accessibleOrder(...args),
  storePhoto: (...args: unknown[]) => storePhoto(...args),
  unattachedPhotoCount: (...args: unknown[]) => unattachedPhotoCount(...args),
}))

import middlewares from "../../../../middlewares"
import { guestProblemAddressAttempts, guestProblemNumberAttempts } from "../../../../attempt-limits"
import { POST } from "../route"
import { StorePostGuestProblemPhoto } from "../validators"

/*
  WHAT TURNS THIS RED (V1.2, the photo route). A miss answered with anything but the one 404; a non-image stored;
  the ten-upload cap missing (an abandoned form fills the disk); the route registered without its own limits
  (the lookup's would be used up by one filing), with the limits after the validation, or without the 8 MB body limit
  (a 5 MB photo is about 7 MB of text; the default limit is 100 kB).
*/
const JPEG_B64 = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 1]).toString("base64")

const run = async (content: string) => {
  const json = jest.fn()
  const status = jest.fn().mockReturnValue({ json })
  await POST(
    { validatedBody: { order_number: "1042", email: "vevo@example.hu", content }, scope: {} } as never,
    { json, status } as never,
  )
  return { json, status }
}

beforeEach(() => {
  accessibleOrder.mockResolvedValue({ id: "order_1", itemIds: [] })
  unattachedPhotoCount.mockResolvedValue(0)
  storePhoto.mockResolvedValue({ id: "img_1", url: "https://x/y.jpg" })
})
afterEach(() => {
  accessibleOrder.mockReset()
  storePhoto.mockReset()
  unattachedPhotoCount.mockReset()
})

describe("POST /store/guest-orders/problem-photos", () => {
  it("a miss is one 404 with one text, and nothing is read or stored", async () => {
    accessibleOrder.mockResolvedValue(null)
    const { json, status } = await run(JPEG_B64)
    expect(status).toHaveBeenCalledWith(404)
    expect(json).toHaveBeenCalledWith({ message: "Nem találtuk a rendelést." })
    expect(unattachedPhotoCount).not.toHaveBeenCalled()
    expect(storePhoto).not.toHaveBeenCalled()
  })

  it("stores a JPEG and answers only its id", async () => {
    const { json, status } = await run(JPEG_B64)
    expect(status).toHaveBeenCalledWith(201)
    expect(json).toHaveBeenCalledWith({ photo_id: "img_1" })
    expect(storePhoto).toHaveBeenCalledWith(expect.anything(), "order_1", expect.any(Buffer), {
      ext: "jpg",
      mime: "image/jpeg",
    })
  })

  it("refuses what is not an image, with the reason, and stores nothing", async () => {
    const { json, status } = await run(Buffer.from("<svg onload=1>").toString("base64"))
    expect(status).toHaveBeenCalledWith(400)
    expect(json).toHaveBeenCalledWith({ type: "invalid_photo", reason: "not_an_image" })
    expect(storePhoto).not.toHaveBeenCalled()
  })

  it("refuses the eleventh unsent upload of an order", async () => {
    unattachedPhotoCount.mockResolvedValue(10)
    const { status } = await run(JPEG_B64)
    expect(status).toHaveBeenCalledWith(429)
    expect(storePhoto).not.toHaveBeenCalled()
    unattachedPhotoCount.mockResolvedValue(9)
    expect((await run(JPEG_B64)).status).toHaveBeenCalledWith(201)
  })
})

describe("the photo route's body and registration", () => {
  const parse = (value: unknown) => StorePostGuestProblemPhoto.safeParse(value).success

  it("accepts the pair and a content text, refuses an extra key, an empty content and an oversized text", () => {
    expect(parse({ order_number: "#1042", email: "a@b.hu", content: "AAAA" })).toBe(true)
    expect(parse({ order_number: "1042", email: "a@b.hu", content: "AAAA", filename: "x.jpg" })).toBe(false)
    expect(parse({ order_number: "1042", email: "a@b.hu", content: "" })).toBe(false)
    expect(parse({ order_number: "1042", email: "a@b.hu", content: "A".repeat(7_000_001) })).toBe(false)
    expect(parse({ order_number: "12ab", email: "a@b.hu", content: "AAAA" })).toBe(false)
  })

  it("has its own limits before the validation, and the 8 MB body limit", () => {
    const entry = (middlewares.routes ?? []).find((r) => r.matcher === "/store/guest-orders/problem-photos") as any
    expect(entry).toBeDefined()
    expect(entry.bodyParser).toEqual({ sizeLimit: "8mb" })
    expect(entry.middlewares).toHaveLength(3)
    expect(entry.middlewares[0]).toBe(guestProblemAddressAttempts)
    expect(entry.middlewares[1]).toBe(guestProblemNumberAttempts)
  })
})
