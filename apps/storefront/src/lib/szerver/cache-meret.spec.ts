// @vitest-environment node
import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import {
  cacheMeretBeallitas,
  cacheMeretMeres,
  konyvtarMeret,
} from "./cache-meret"

/**
 * A `.next/cache` MERETFIGYELESE (FE-7). MI PIROSIT: ha az almappak merete
 * kimaradna; ha a hatar felett nem szolna, vagy alatta is szolna; ha a
 * riasztas-sor neve valtozna (arra figyel az infra).
 */
let mappa = ""
afterEach(() => {
  if (mappa) rmSync(mappa, { recursive: true, force: true })
  vi.restoreAllMocks()
})

function cache(meretek: Record<string, number>) {
  mappa = mkdtempSync(join(tmpdir(), "cache-meret-"))
  for (const [ut, bajt] of Object.entries(meretek)) {
    const teljes = join(mappa, ut)
    mkdirSync(join(teljes, ".."), { recursive: true })
    writeFileSync(teljes, new Uint8Array(bajt))
  }
  return mappa
}

describe("konyvtarMeret", () => {
  it("az almappákat is összeadja", async () => {
    const ut = cache({
      "a.json": 1000,
      "fetch-cache/b": 2000,
      "images/x/c": 3000,
    })
    expect(await konyvtarMeret(ut)).toBe(6000)
  })

  it("nem létező mappára 0", async () => {
    expect(await konyvtarMeret("/nincs/ilyen/mappa")).toBe(0)
  })
})

describe("cacheMeretMeres", () => {
  it("a határ fölött név szerint kereshető riasztás-sort ír", async () => {
    const konyvtar = cache({ "nagy.bin": 2 * 1024 * 1024 })
    const naplo = vi.fn()
    const mb = await cacheMeretMeres(
      { konyvtar, hatarMb: 1, intervallumMs: 60_000 },
      naplo,
    )
    expect(mb).toBe(2)
    expect(naplo).toHaveBeenCalledTimes(1)
    const sor = naplo.mock.calls[0]![0] as string
    expect(sor.startsWith("CACHE-MERET-RIASZTAS ")).toBe(true)
    expect(JSON.parse(sor.slice("CACHE-MERET-RIASZTAS ".length))).toMatchObject(
      {
        mb: 2,
        hatarMb: 1,
      },
    )
  })

  it("a határ alatt nem szól", async () => {
    const konyvtar = cache({ "kicsi.bin": 1024 })
    const naplo = vi.fn()
    await cacheMeretMeres(
      { konyvtar, hatarMb: 1, intervallumMs: 60_000 },
      naplo,
    )
    expect(naplo).not.toHaveBeenCalled()
  })
})

describe("cacheMeretBeallitas", () => {
  it("alapból 2048 MB és 15 perc, a .next/cache a munkakönyvtárban", () => {
    expect(cacheMeretBeallitas({}, "/app/apps/storefront")).toEqual({
      konyvtar: "/app/apps/storefront/.next/cache",
      hatarMb: 2048,
      intervallumMs: 15 * 60_000,
    })
  })

  it("a környezetből olvas, hibás értékre az alapot adja", () => {
    expect(
      cacheMeretBeallitas(
        { CACHE_MERET_HATAR_MB: "512", CACHE_MERET_PERC: "5" },
        "/x",
      ),
    ).toMatchObject({ hatarMb: 512, intervallumMs: 5 * 60_000 })
    expect(
      cacheMeretBeallitas(
        { CACHE_MERET_HATAR_MB: "sok", CACHE_MERET_PERC: "0" },
        "/x",
      ),
    ).toMatchObject({ hatarMb: 2048, intervallumMs: 15 * 60_000 })
  })
})
