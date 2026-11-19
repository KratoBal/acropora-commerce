import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * MINDEN `placeOrder(...)` HIVAS ATADJA AZ OLDAL SZEGMENSET (a kirakat angol nezete, 2026-11-19). A leadas a visszaigazolo laphoz (es az elkelt-darab
 * esetben a kosarhoz) iranyit at, es amit nem kap, azt magyarra irja: az angol penztar vevoje a MAGYAR visszaigazolasra jutott. Ot hivohely van
 * (a fizetesi lap 3DS-visszateres agan, a kozos Stripe-gomb, a Stripe-gomb, az express-gomb, a kozvetlen rendeles gomb); ezek komponens-tesztjei
 * kozul ketto-harom fedi a sajat hivasat, a tobbit ez a forras-ellenorzes fogja meg. MI PIROSIT: egy ujabb vagy egy atirt hivas, ami a szegmens nelkul
 * hivja a leadast.
 */
const gyoker = join(__dirname, "..", "..", "..")

const forrasok = (mappa: string): string[] =>
  readdirSync(mappa).flatMap((nev) => {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory())
      return nev === "node_modules" ? [] : forrasok(ut)
    return /\.(ts|tsx)$/.test(nev) && !/\.(spec|test)\./.test(nev) ? [ut] : []
  })

describe("a placeOrder hívásai", () => {
  const hivasok = forrasok(gyoker).flatMap((fajl) => {
    // a hivas: `placeOrder(` + argumentumok, a fuggveny sajat definicioja es a komment-sorok nelkul
    const minta =
      /^(?!\s*(?:\*|\/\/|export async function)).*?\bplaceOrder\(([^)]*)\)/gm
    const talalatok: { fajl: string; argumentumok: string }[] = []
    const forras = readFileSync(fajl, "utf8")
    for (let m = minta.exec(forras); m; m = minta.exec(forras))
      talalatok.push({
        fajl: fajl.slice(gyoker.length + 1),
        argumentumok: m[1]!.trim(),
      })
    return talalatok
  })

  it("megtalálja a hívóhelyeket (az ellenőrzés nem üres)", () => {
    expect(hivasok.length).toBeGreaterThanOrEqual(5)
  })

  it("mindegyik átadja az oldal szegmensét (a második argumentum)", () => {
    const hianyzik = hivasok.filter((h) => !h.argumentumok.includes(","))
    expect(hianyzik).toEqual([])
  })
})
