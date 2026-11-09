import { STOCK_ALERT_CONSENT, speciesOfTitle, stockAlertOn } from "../subject"

/*
  WHAT TURNS THIS RED. A species read from a title that names none (a word that is not a binomial, "sp.", "cf.");
  the key not lowercased, so "Acropora Tenuis" and "acropora tenuis" waited on two lists; the label losing the
  title's spelling; the switch on for anything but "on"; the consent sentences drifting from korall's.
*/
describe("speciesOfTitle", () => {
  it("SA-SPECIES: the binomial at the head of the title; the key lowercased, the label as written", () => {
    expect(speciesOfTitle("Acropora abrolhosensis ULTRA")).toEqual({
      key: "acropora abrolhosensis",
      label: "Acropora abrolhosensis",
    })
    expect(speciesOfTitle("  Montipora capricornis zöld frag")).toEqual({
      key: "montipora capricornis",
      label: "Montipora capricornis",
    })
    expect(speciesOfTitle("Euphyllia paraancora")?.key).toBe("euphyllia paraancora")
  })

  it("SA-SPECIES-NONE: no binomial, or an epithet that names no species, is no species", () => {
    for (const title of [
      "Red Sea Reef Foundation A",
      "ACROPORA abrolhosensis",
      "Acropora sp. Tricolor",
      "Acropora spp.",
      "Acropora cf. tenuis",
      "Montipora aff. setosa",
      "Acropora",
      "",
      null,
      undefined,
    ])
      expect([title, speciesOfTitle(title)]).toEqual([title, null])
  })
})

describe("the switch and the consent", () => {
  it("SA-SWITCH: on only for the word on", () => {
    expect(stockAlertOn({ ACROPORA_STOCK_ALERT: "on" } as NodeJS.ProcessEnv)).toBe(true)
    expect(stockAlertOn({ ACROPORA_STOCK_ALERT: " on " } as NodeJS.ProcessEnv)).toBe(true)
    for (const value of [undefined, "", "yes", "true", "ON"])
      expect([value, stockAlertOn({ ACROPORA_STOCK_ALERT: value } as NodeJS.ProcessEnv)]).toEqual([value, false])
  })

  it("SA-CONSENT: korall's sentence, species and product apart, and an English twin for each", () => {
    expect(STOCK_ALERT_CONSENT.hu.species).toBe("Hozzájárulok, hogy erre a címre értesítést küldjetek erről a fajról.")
    expect(STOCK_ALERT_CONSENT.hu.product).toBe("Hozzájárulok, hogy erre a címre értesítést küldjetek erről a termékről.")
    expect(STOCK_ALERT_CONSENT.en.species).toBe("I agree to be notified at this address about this species.")
    expect(STOCK_ALERT_CONSENT.en.product).toBe("I agree to be notified at this address about this product.")
  })
})
