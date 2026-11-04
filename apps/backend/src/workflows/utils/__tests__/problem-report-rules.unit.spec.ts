import {
  MAX_PHOTO_BYTES,
  cleanDescription,
  cleanPhone,
  decodePhoto,
  isProblemKind,
  sniffImage,
} from "../problem-report/rules"

/*
  WHAT TURNS THIS RED (V1.2). A photo accepted by the type the browser names instead of its bytes (an SVG or an HTML
  page stored as an "image"); a file over the size limit accepted; the size limit checked only AFTER decoding a huge
  text; padding or base64 alphabet slack; an unknown problem kind accepted; control characters kept in the text.
*/
const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46])
const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0])

describe("sniffImage", () => {
  it("knows a JPEG and a PNG by their first bytes", () => {
    expect(sniffImage(JPEG)).toEqual({ ext: "jpg", mime: "image/jpeg" })
    expect(sniffImage(PNG)).toEqual({ ext: "png", mime: "image/png" })
  })

  it("refuses everything else: SVG, HTML, GIF, PDF, an empty or a short file", () => {
    for (const text of [
      "<svg xmlns='http://www.w3.org/2000/svg'/>",
      "<html><script>1</script>",
      "GIF89a....",
      "%PDF-1.4",
    ])
      expect(sniffImage(Buffer.from(text))).toBeNull()
    expect(sniffImage(Buffer.alloc(0))).toBeNull()
    expect(sniffImage(Buffer.from([0xff, 0xd8]))).toBeNull()
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47]))).toBeNull()
    // the first bytes must match completely: a near miss is not an image
    expect(sniffImage(Buffer.from([0xff, 0xd8, 0x00, 0xe0]))).toBeNull()
    expect(sniffImage(Buffer.from([0xff, 0x00, 0xff, 0xe0]))).toBeNull()
    expect(sniffImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0b, 0, 0]))).toBeNull()
  })
})

describe("decodePhoto", () => {
  it("decodes a JPEG and a PNG sent as base64", () => {
    const jpeg = decodePhoto(JPEG.toString("base64"))
    expect(jpeg.ok && jpeg.type.ext).toBe("jpg")
    const png = decodePhoto(PNG.toString("base64"))
    expect(png.ok && png.bytes.length).toBe(PNG.length)
  })

  it("refuses an empty text, a text outside the base64 alphabet, and a wrong length", () => {
    expect(decodePhoto("   ")).toEqual({ ok: false, reason: "empty" })
    expect(decodePhoto("not base64 !!")).toEqual({ ok: false, reason: "not_base64" })
    expect(decodePhoto("data:image/png;base64,AAAA")).toEqual({ ok: false, reason: "not_base64" })
    expect(decodePhoto("AAA")).toEqual({ ok: false, reason: "not_base64" })
    expect(decodePhoto("=AAA")).toEqual({ ok: false, reason: "not_base64" })
  })

  it("refuses a valid base64 text that is not an image", () => {
    expect(decodePhoto(Buffer.from("<svg onload=alert(1)>").toString("base64"))).toEqual({
      ok: false,
      reason: "not_an_image",
    })
  })

  it("the size limit is decided on the DECODED size, at the boundary, before decoding", () => {
    const exact = Buffer.concat([JPEG, Buffer.alloc(MAX_PHOTO_BYTES - JPEG.length)])
    expect(decodePhoto(exact.toString("base64")).ok).toBe(true)
    const over = Buffer.concat([JPEG, Buffer.alloc(MAX_PHOTO_BYTES - JPEG.length + 1)])
    expect(decodePhoto(over.toString("base64"))).toEqual({ ok: false, reason: "too_large" })
  })
})

describe("the small cleaners", () => {
  it("knows the five problem kinds and nothing else", () => {
    for (const kind of ["animal_dead", "animal_hurt", "item_damaged", "item_missing", "other"])
      expect(isProblemKind(kind)).toBe(true)
    for (const kind of ["", "Other", "animal", 5, null, undefined]) expect(isProblemKind(kind)).toBe(false)
  })

  it("a phone number is trimmed, an empty one is null", () => {
    expect(cleanPhone(" +36 30 123 4567 ")).toBe("+36 30 123 4567")
    expect(cleanPhone("   ")).toBeNull()
    expect(cleanPhone(null)).toBeNull()
    expect(cleanPhone(undefined)).toBeNull()
  })

  it("the description keeps its line breaks and loses control characters", () => {
    expect(cleanDescription("  Sérült\r\nláb\u0007\u0000 \n\ttörött ")).toBe("Sérült\nláb \n\ttörött")
  })
})
