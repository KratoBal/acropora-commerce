import { translator } from "@lib/i18n/dictionary"
import { existsSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

import {
  FIOK_PONTOK,
  aktivPont,
  fiokCim,
  fiokLeiras,
  reszletekUtvonal,
} from "./pontok"

/**
 * A FIOK MENUJENEK PONTJAI. MI PIROSIT: ha egy pont nem letezo lapra visz; ha
 * a rendeles reszletei nem a Rendeléseim alatt aktiv; ha a nyitolap egy pontot
 * aktivnak jelol; ha a cim nem a pontbol jon.
 */
describe("a fiók menüjének pontjai", () => {
  it("minden pont létező lapra visz", () => {
    const gyoker = join(
      __dirname,
      "..",
      "..",
      "..",
      "..",
      "app",
      "[countryCode]",
      "(main)",
      "account",
      "@dashboard",
    )
    for (const pont of FIOK_PONTOK) {
      const lap = join(gyoker, pont.href.replace(/^\/account/, ""), "page.tsx")
      expect(existsSync(lap), pont.href).toBe(true)
    }
  })

  it("a keret sorrendje: Profil, Rendeléseim, Címek, Számlázási adatok, Beállítások", () => {
    // A keret Hűségpontok pontja kimarad: nincs mogotte adat (P5-LEFT-OUT).
    const t = translator("hu")
    expect(FIOK_PONTOK.map((p) => t(p.cimke))).toEqual([
      "Profil",
      "Rendeléseim",
      "Címek",
      "Számlázási adatok",
      "Beállítások",
    ])
    // A mobil ful a keret rovid alakja (257:225).
    expect(t(FIOK_PONTOK[3].mobilCimke)).toBe("Számlázás")
  })

  it("az aktív pont az útvonalból jön, a részletek a Rendeléseim alá tartoznak", () => {
    expect(aktivPont("/hu/account/profile", "hu")).toBe("/account/profile")
    expect(aktivPont("/hu/account/orders/details/order_1", "hu")).toBe(
      "/account/orders",
    )
    expect(aktivPont("/hu/account", "hu")).toBeNull()
    // Egy hasonlo kezdetu, de mas utvonal nem aktiv.
    expect(aktivPont("/hu/account/profileX", "hu")).toBeNull()
  })

  it("a lap címe a pont felirata, a nyitólapé Áttekintés", () => {
    expect(fiokCim("/hu/account/addresses", "hu")).toBe("Címek")
    expect(fiokCim("/hu/account", "hu")).toBe("Áttekintés")
  })

  it("a rendelések fejének leírása a mobil keret mondata, a többi lapon nincs", () => {
    expect(fiokLeiras("/hu/account/orders", "hu")).toBe(
      "Aktuális és korábbi rendeléseid egy helyen.",
    )
    expect(fiokLeiras("/hu/account/profile", "hu")).toBeUndefined()
  })

  it("a rendelés részletei saját keretben: csak a details útvonal", () => {
    expect(reszletekUtvonal("/hu/account/orders/details/order_1", "hu")).toBe(
      true,
    )
    expect(reszletekUtvonal("/hu/account/orders", "hu")).toBe(false)
    expect(reszletekUtvonal("/hu/account/profile", "hu")).toBe(false)
  })
})

describe("a fiók menüje és címe a lap nyelvén", () => {
  const en = translator("en")
  const hu = translator("hu")

  it("az angol menü felirata és mobil alakja", () => {
    expect(FIOK_PONTOK.map((p) => en(p.cimke))).toEqual([
      "Profile",
      "My orders",
      "Addresses",
      "Billing details",
      "Settings",
    ])
    expect(en(FIOK_PONTOK[3].mobilCimke)).toBe("Billing")
  })

  it("a fej címe és leírása a nyelv szerint, az áttekintés a tartalék", () => {
    expect(fiokCim("/en-hu/account/orders", "en-hu", en)).toBe("My orders")
    expect(fiokCim("/hu/account/orders", "hu", hu)).toBe("Rendeléseim")
    expect(fiokCim("/en-hu/account", "en-hu", en)).toBe("Overview")
    expect(fiokLeiras("/en-hu/account/orders", "en-hu", en)).toBe(
      "Your current and past orders in one place.",
    )
    expect(fiokLeiras("/en-hu/account/profile", "en-hu", en)).toBeUndefined()
  })
})
