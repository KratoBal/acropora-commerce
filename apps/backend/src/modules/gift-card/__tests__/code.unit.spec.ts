import { giftCardCodeHash, newGiftCardCode, normalizeGiftCardCode } from "../code"

/*
  A GIFT CARD CODE (card 495c0007). WHAT TURNS RED: a code that is not 16 Crockford characters in four groups; two
  codes alike; typing it back with other case, spaces or dashes, or O for 0 and I or L for 1, not finding it; a
  malformed code taken as one; the stored hash not the hash of the normalized code.
*/
describe("gift card code", () => {
  it("is 16 Crockford base32 characters in four groups, and random", () => {
    const codes = Array.from({ length: 200 }, newGiftCardCode)
    for (const code of codes) expect(code).toMatch(/^[0-9A-HJKMNP-TV-Z]{4}(-[0-9A-HJKMNP-TV-Z]{4}){3}$/)
    expect(new Set(codes).size).toBe(200)
  })

  it("is found when typed back carelessly, and a malformed one is not a code", () => {
    expect(normalizeGiftCardCode(" 7k3m-qx9p 2zrt-h4bw ")).toBe("7K3MQX9P2ZRTH4BW")
    expect(normalizeGiftCardCode("7K3M-QX9P-2ZRT-H4BO")).toBe("7K3MQX9P2ZRTH4B0")
    expect(normalizeGiftCardCode("7K3M-QX9P-2ZRT-H4BL")).toBe("7K3MQX9P2ZRTH4B1")
    expect(normalizeGiftCardCode("7K3M-QX9P-2ZRT-H4B")).toBeNull()
    expect(normalizeGiftCardCode("7K3M-QX9P-2ZRT-H4BU")).toBeNull()
    expect(normalizeGiftCardCode("KUPON-10")).toBeNull()
  })

  it("is kept as the SHA-256 of its normalized form", () => {
    const hash = giftCardCodeHash("7K3MQX9P2ZRTH4BW")
    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(giftCardCodeHash(normalizeGiftCardCode("7k3m-qx9p-2zrt-h4bw")!)).toBe(hash)
  })
})
