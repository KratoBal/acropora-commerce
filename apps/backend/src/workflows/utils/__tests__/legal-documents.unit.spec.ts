import {
  FOGYASZTOBARAT_DEFAULT_ID_HU,
  legalReadiness,
  legalSource,
  readLegalConfig,
} from "../legal-documents"

/**
 * THE GATE'S CONFIGURATION (card f6cb0a51). What must fail: a shop that takes
 * orders with the switch off, with the English source empty or malformed, or
 * with the Hungarian id cleared; a refusal that does not name what is missing.
 */
const full = { FOGYASZTOBARAT_ENABLED: "true", FOGYASZTOBARAT_ID_HU: "JPNFMVH0", FOGYASZTOBARAT_ID_EN: "ENSHOP01" }

describe("readLegalConfig", () => {
  it("reads the switch as exactly 'true', trimmed like the storefront's", () => {
    expect(readLegalConfig({ FOGYASZTOBARAT_ENABLED: " true " }).enabled).toBe(true)
    for (const value of [undefined, "", "TRUE", "1", "false"])
      expect(readLegalConfig({ FOGYASZTOBARAT_ENABLED: value }).enabled).toBe(false)
  })

  it("the Hungarian id defaults to the shop's current one only when it is unset", () => {
    expect(readLegalConfig({}).hu).toBe(FOGYASZTOBARAT_DEFAULT_ID_HU)
    expect(readLegalConfig({ FOGYASZTOBARAT_ID_HU: "" }).hu).toBeNull()
  })

  it("the English source has no default, and an id that is not a plain id counts as not set", () => {
    expect(readLegalConfig({}).en).toBeNull()
    expect(readLegalConfig({ FOGYASZTOBARAT_ID_EN: " ENSHOP01 " }).en).toBe("ENSHOP01")
    for (const bad of ["a b", "x&y=1", "../x", "a".repeat(33)])
      expect(readLegalConfig({ FOGYASZTOBARAT_ID_EN: bad }).en).toBeNull()
  })
})

describe("legalReadiness", () => {
  it("complete only with the switch on and both languages configured", () => {
    expect(legalReadiness(readLegalConfig(full))).toEqual({ complete: true })
  })

  it("names every missing setting", () => {
    expect(legalReadiness(readLegalConfig({}))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ENABLED", "FOGYASZTOBARAT_ID_EN"],
    })
    expect(legalReadiness(readLegalConfig({ ...full, FOGYASZTOBARAT_ID_EN: "" }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ID_EN"],
    })
    expect(legalReadiness(readLegalConfig({ ...full, FOGYASZTOBARAT_ID_HU: "" }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ID_HU"],
    })
    expect(legalReadiness(readLegalConfig({ ...full, FOGYASZTOBARAT_ENABLED: "false" }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ENABLED"],
    })
  })
})

describe("the test-only English relaxation (FOGYASZTOBARAT_REQUIRE_EN)", () => {
  it("only the exact value 'false' stops requiring the English source; the Hungarian half and the switch stay required", () => {
    const relaxed = { ...full, FOGYASZTOBARAT_ID_EN: "", FOGYASZTOBARAT_REQUIRE_EN: "false" }
    expect(legalReadiness(readLegalConfig(relaxed))).toEqual({ complete: true })
    expect(legalReadiness(readLegalConfig({ ...relaxed, FOGYASZTOBARAT_ID_HU: "" }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ID_HU"],
    })
    expect(legalReadiness(readLegalConfig({ ...relaxed, FOGYASZTOBARAT_ENABLED: "" }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ENABLED"],
    })
  })

  it("any other value, or none, keeps the English source required", () => {
    for (const value of [undefined, "", "true", "FALSE", "0", "no"])
      expect(
        legalReadiness(readLegalConfig({ ...full, FOGYASZTOBARAT_ID_EN: "", FOGYASZTOBARAT_REQUIRE_EN: value }))
      ).toEqual({ complete: false, missing: ["FOGYASZTOBARAT_ID_EN"] })
  })
})

describe("legalSource", () => {
  it("is the api.php address of the key and the shop id, encoded", () => {
    expect(legalSource("aszf", "JPNFMVH0")).toBe("https://admin.fogyasztobarat.hu/api.php?aszf=JPNFMVH0")
    expect(legalSource("a&b", "x y")).toBe("https://admin.fogyasztobarat.hu/api.php?a%26b=x%20y")
  })
})
