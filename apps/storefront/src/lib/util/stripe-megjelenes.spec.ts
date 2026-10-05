import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it } from "vitest"

import {
  STRIPE_FIZETESI_MEZO,
  STRIPE_LEKEREKITES,
  STRIPE_MODOK,
  STRIPE_SZINEK,
  stripeElementsBeallitas,
  stripeMegjelenes,
  stripeVilagDokumentumbol,
} from "./stripe-megjelenes"

/**
 * A STRIPE MEZO A TOKEN-FAJL SZERINT (Balazs, 2026-10-05). MI PIROSIT: egy
 * itteni szin, ami nem a `acropora-tokens.css` erteke; egy mod, ami mas
 * primitivre mutat, mint a CSS mod-tokenje; a Link visszakapcsolva; nem magyar
 * nyelv; a Reef felulet Commerce-nek olvasva.
 */
const css = readFileSync(
  join(__dirname, "../../styles/acropora-tokens.css"),
  "utf8",
)

/**
 * Egy szelektor-blokk valtozoi. Az `elotag` a blokk ele irt szoveg (`}\n`):
 * egy szelektor-lista vege egy hosszabb lista vegen is allhat.
 */
function blokk(szelektor: string, elotag = ""): Map<string, string> {
  const talalat = css.indexOf(elotag + szelektor + " {")
  expect(talalat, `nincs ilyen blokk: ${szelektor}`).toBeGreaterThanOrEqual(0)
  const kezdet = talalat + elotag.length
  const torzs = css.slice(kezdet, css.indexOf("}", kezdet))
  return new Map(
    Array.from(torzs.matchAll(/(--[\w-]+):\s*([^;]+);/g)).map((m) => [
      m[1],
      m[2].trim(),
    ]),
  )
}

const alap = blokk(":root")
const MOD_BLOKK = {
  commerce: blokk(':root,\n[data-vilag="vilagos"]'),
  reef: blokk(
    '[data-vilag="sotet"],\nbody:has([data-vilag="sotet"]) [data-fejlec],\nbody:has([data-acr-mod="reef"]) [data-fejlec]',
  ),
}
const MEZO_BLOKK = {
  commerce: blokk("[data-fejlec]", "\n"),
  reef: blokk(
    'body:has([data-vilag="sotet"]) [data-fejlec],\nbody:has([data-acr-mod="reef"]) [data-fejlec]',
    "}\n",
  ),
}

describe("a Stripe mező a Foundations tokenekből", () => {
  it("minden szín betűre a token-fájl primitívje", () => {
    for (const [nev, hex] of Object.entries(STRIPE_SZINEK)) {
      expect(alap.get(`--acr-color-${nev}`), nev).toBe(hex)
    }
    expect(alap.get("--acr-radius-control")).toBe(STRIPE_LEKEREKITES)
  })

  it("a két mód ugyanarra a primitívre mutat, mint a CSS mód-tokenje", () => {
    for (const vilag of ["commerce", "reef"] as const) {
      const mod = STRIPE_MODOK[vilag]
      for (const token of ["heading", "text", "border", "action-bg"] as const) {
        expect(
          MOD_BLOKK[vilag].get(`--acr-mode-${token}`),
          `${vilag} ${token}`,
        ).toBe(`var(--acr-color-${mod[token]})`)
      }
      expect(MEZO_BLOKK[vilag].get("--fejlec-mezo-hatter"), vilag).toBe(
        `var(--acr-color-${mod.mezo})`,
      )
    }
  })

  it("a Commerce világos, a Reef sötét, a mód akció-színével", () => {
    expect(stripeMegjelenes("commerce").variables).toMatchObject({
      colorPrimary: "#0f2338",
      colorBackground: "#ffffff",
      colorText: "#0d1a28",
    })
    expect(stripeMegjelenes("reef").variables).toMatchObject({
      colorPrimary: "#d5782f",
      colorBackground: "#0a1726",
      colorText: "#ffffff",
    })
    expect(stripeMegjelenes("reef").theme).toBe("night")
  })

  it("magyar nyelv, Apple Pay és Google Pay, Link soha", () => {
    expect(stripeElementsBeallitas("commerce").locale).toBe("hu")
    expect(STRIPE_FIZETESI_MEZO.wallets).toEqual({
      applePay: "auto",
      googlePay: "auto",
      link: "never",
    })
  })

  it("a világot a lap jelölője adja, ugyanaz a kettő, amit a CSS figyel", () => {
    const lap = (talalat: boolean) => ({
      querySelector: (szelektor: string) =>
        talalat &&
        szelektor.includes('[data-vilag="sotet"]') &&
        szelektor.includes('[data-acr-mod="reef"]')
          ? ({} as Element)
          : null,
    })
    expect(stripeVilagDokumentumbol(lap(true))).toBe("reef")
    expect(stripeVilagDokumentumbol(lap(false))).toBe("commerce")
  })
})
