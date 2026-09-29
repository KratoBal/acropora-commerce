import {
  isValidSimplePaySignature,
  readSimplePayBack,
  signSimplePay,
} from "../signature"

/**
 * THE SIMPLEPAY SIGNATURE, ON THE DOCUMENT'S OWN TEST VECTORS
 * (SimplePay_2x_API_v2_HU_260901, exchange/simplepay-v2-2026-09-29). The key
 * below is the document's published example key, not ours.
 */
const DOC_KEY = "FxDa5w314kLlNseq2sKuVwaqZshZT5d6"

// L632-635, joined into one line as the document instructs (L626), escaped
// slashes included: the signature covers these exact bytes.
const DOC_BODY =
  '{"salt":"f2dbffcef9a3ab94b618ddb59f0da637","merchant":"PUBLICTESTHUF","orderRef":"1853354717597262343977","currency":"HUF","customerEmail":"sdk_test@simplepay.com","language":"HU","sdkVersion":"SimplePay_PHP_SDK_2.1.5_250731:819df13a2304433007f4e3159610f623","methods":["CARD"],"total":"25","timeout":"2025-10-06T07:00:34+02:00","url":"https:\\/\\/sdk.simplepay.hu\\/back.php"}'
const DOC_SIGNATURE = "ioi43JEN1utnzPTdJGjuU7we8zgyWh7s0NILYgN0PYLej3OnyjFohbI3YZ747J0v"

// L994-996, URL-decoded (the framework decodes the query string).
const DOC_BACK_R =
  "eyJyIjowLCJ0Ijo5OTg0NDk0MiwiZSI6IlNVQ0NFU1MiLCJtIjoiUFVCTElDVEVTVEhVRiIsIm8iOiIxMDEwMTA1MTU2ODAyOTI0ODI2MDAifQ=="
const DOC_BACK_S = "El/nvex9TjgjuORI63gEu5I5miGo4CSAD5lmEpKIxp7WuVRq6bBeh1QdyEvVGSsi"

describe("the SimplePay signature", () => {
  it("reproduces the document's request signature (L641)", () => {
    expect(signSimplePay(DOC_BODY, DOC_KEY)).toBe(DOC_SIGNATURE)
    expect(isValidSimplePaySignature(DOC_BODY, DOC_SIGNATURE, DOC_KEY)).toBe(true)
  })

  it("refuses one changed byte, another key, and no signature", () => {
    expect(isValidSimplePaySignature(DOC_BODY.replace('"25"', '"26"'), DOC_SIGNATURE, DOC_KEY)).toBe(false)
    expect(isValidSimplePaySignature(DOC_BODY, DOC_SIGNATURE, "masik-kulcs")).toBe(false)
    expect(isValidSimplePaySignature(DOC_BODY, null, DOC_KEY)).toBe(false)
  })

  it("is computed on the raw bytes: the same JSON re-serialized does not verify", () => {
    const reserialized = JSON.stringify(JSON.parse(DOC_BODY))
    expect(reserialized).not.toBe(DOC_BODY)
    expect(isValidSimplePaySignature(reserialized, DOC_SIGNATURE, DOC_KEY)).toBe(false)
  })
})

describe("the back redirect", () => {
  it("reads the document's example: s signs the DECODED JSON of r", () => {
    expect(readSimplePayBack(DOC_BACK_R, DOC_BACK_S, DOC_KEY)).toEqual({
      r: 0,
      t: 99844942,
      e: "SUCCESS",
      m: "PUBLICTESTHUF",
      o: "101010515680292482600",
    })
  })

  it("a forged r or s reads as nothing", () => {
    const forged = Buffer.from(
      '{"r":0,"t":99844942,"e":"SUCCESS","m":"PUBLICTESTHUF","o":"masik"}'
    ).toString("base64")
    expect(readSimplePayBack(forged, DOC_BACK_S, DOC_KEY)).toBeNull()
    expect(readSimplePayBack(DOC_BACK_R, "rossz", DOC_KEY)).toBeNull()
  })
})
