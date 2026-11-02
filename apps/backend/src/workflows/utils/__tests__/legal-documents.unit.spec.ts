import {
  FOGYASZTOBARAT_DEFAULT_ID_HU,
  legalReadiness,
  legalSource,
  logLegalGateMode,
  resolveLegalGateMode,
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

/**
 * THE TEST MODE (Balázs 2026-11-02 10:05 UTC). What must fail: a missing or
 * mistyped variable that opens the gate; test mode granted on the live shop or
 * where the shop cannot prove it is not live; a refusal that is not logged.
 */
const TEST_SHOP = "https://shop-staging.acropora.hu"

describe("resolveLegalGateMode", () => {
  it("a missing, empty or enforce variable is enforce, with no complaint", () => {
    for (const value of [undefined, "", "  ", "enforce"])
      expect(resolveLegalGateMode({ LEGAL_GATE_MODE: value, ACROPORA_STOREFRONT_URL: TEST_SHOP })).toEqual({
        mode: "enforce",
        problem: null,
      })
  })

  it("test on a test address is test", () => {
    expect(resolveLegalGateMode({ LEGAL_GATE_MODE: " test ", ACROPORA_STOREFRONT_URL: TEST_SHOP })).toEqual({
      mode: "test",
      problem: null,
    })
  })

  it("a typo is enforce, and says so", () => {
    for (const value of ["Test", "TEST", "off", "false", "teszt"]) {
      const result = resolveLegalGateMode({ LEGAL_GATE_MODE: value, ACROPORA_STOREFRONT_URL: TEST_SHOP })
      expect(result.mode).toBe("enforce")
      expect(result.problem).toContain("LEGAL_GATE_MODE")
    }
  })

  it("test is granted ONLY on the test shop's exact host: the live shop, a www., a cut-over address and look-alikes are enforce", () => {
    for (const url of [
      "https://shop.acropora.hu",
      "https://shop.acropora.hu/",
      "https://www.shop.acropora.hu",
      "https://acropora.hu",
      "http://www.acropora.hu/",
      "https://www.shop-staging.acropora.hu",
      "https://shop-staging.acropora.hu.evil.com",
      "https://evil-shop-staging.acropora.hu",
      "https://shop-staging.acropora.hu@evil.com",
      "https://evil.com/shop-staging.acropora.hu",
      "https://shop-staging2.acropora.hu",
      "https://shop-uj.acropora.hu",
    ]) {
      const result = resolveLegalGateMode({ LEGAL_GATE_MODE: "test", ACROPORA_STOREFRONT_URL: url })
      expect(result.mode).toBe("enforce")
      expect(result.problem).toContain("not a test shop address")
    }
  })

  it("the exact test host is test however it is written (case, port, path)", () => {
    for (const url of [
      "https://shop-staging.acropora.hu",
      "https://shop-staging.acropora.hu/",
      "https://SHOP-STAGING.acropora.hu:443/hu",
      "http://shop-staging.acropora.hu:8000",
    ])
      expect(resolveLegalGateMode({ LEGAL_GATE_MODE: "test", ACROPORA_STOREFRONT_URL: url }).mode).toBe("test")
  })

  it("test cannot show it is the test shop when the address is unset or unreadable: enforce", () => {
    for (const url of [undefined, "", "   ", "not a url", "shop.acropora.hu"]) {
      const result = resolveLegalGateMode({ LEGAL_GATE_MODE: "test", ACROPORA_STOREFRONT_URL: url })
      expect(result.mode).toBe("enforce")
      expect(result.problem).toContain("ACROPORA_STOREFRONT_URL")
    }
  })

  it("a refused test and a granted test are both logged; plain enforce is silent", () => {
    const log = { warn: jest.fn(), error: jest.fn() }
    expect(logLegalGateMode({ LEGAL_GATE_MODE: "test", ACROPORA_STOREFRONT_URL: "https://shop.acropora.hu" }, log)).toBe("enforce")
    expect(log.error).toHaveBeenCalledTimes(1)
    expect(logLegalGateMode({ LEGAL_GATE_MODE: "test", ACROPORA_STOREFRONT_URL: TEST_SHOP }, log)).toBe("test")
    expect(log.warn).toHaveBeenCalledTimes(1)
    log.warn.mockClear()
    log.error.mockClear()
    logLegalGateMode({}, log)
    expect(log.warn).not.toHaveBeenCalled()
    expect(log.error).not.toHaveBeenCalled()
  })
})

describe("legalReadiness in test mode", () => {
  const bare = { LEGAL_GATE_MODE: "test", ACROPORA_STOREFRONT_URL: TEST_SHOP }

  it("test on a test shop is complete with nothing else set", () => {
    expect(legalReadiness(readLegalConfig(bare))).toEqual({ complete: true })
  })

  it("test on the live shop is not: the Fogyasztóbarát settings are required again", () => {
    expect(legalReadiness(readLegalConfig({ ...bare, ACROPORA_STOREFRONT_URL: "https://shop.acropora.hu" }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ENABLED", "FOGYASZTOBARAT_ID_EN"],
    })
  })

  it("the variable missing is enforce, exactly as before", () => {
    expect(legalReadiness(readLegalConfig({ ACROPORA_STOREFRONT_URL: TEST_SHOP }))).toEqual({
      complete: false,
      missing: ["FOGYASZTOBARAT_ENABLED", "FOGYASZTOBARAT_ID_EN"],
    })
  })
})

describe("legalSource", () => {
  it("is the api.php address of the key and the shop id, encoded", () => {
    expect(legalSource("aszf", "JPNFMVH0")).toBe("https://admin.fogyasztobarat.hu/api.php?aszf=JPNFMVH0")
    expect(legalSource("a&b", "x y")).toBe("https://admin.fogyasztobarat.hu/api.php?a%26b=x%20y")
  })
})
