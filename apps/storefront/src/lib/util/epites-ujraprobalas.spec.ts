import { describe, expect, it, vi } from "vitest"

import {
  atmenetiHiba,
  EPITES_FAZIS,
  epitesKozbenUjraprobal,
  feladasUzenet,
} from "./epites-ujraprobalas"

/**
 * A BUILD KOZBENI UJRAPROBALAS (kartya 62811c0f).
 *
 * MI PIROSIT: ha futasidoben is ujraprobalna (egy vasarlo percekig varna); ha
 * egy 4xx-re is ujraprobalna (egy rossz kulcs egy percig lassitana a bukast);
 * ha POST-ot ismetelne; ha a keret kimerulese utan elnyelne a hibat (a valodi
 * kieses zold lenne); ha a feladas nem nevezne meg az URL-t.
 */

class FetchError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message)
  }
}

const halozati = () =>
  Object.assign(new TypeError("fetch failed"), {
    cause: { code: "ECONNREFUSED" },
  })

function proba(valaszok: Array<() => unknown>) {
  let n = 0
  const hivas = vi.fn(async () => {
    const valasz = valaszok[Math.min(n++, valaszok.length - 1)]!()
    if (valasz instanceof Error) throw valasz
    return valasz
  })
  return hivas
}

const opciok = () => {
  const alszik = vi.fn(async (_ms: number) => {})
  const naplo = vi.fn()
  return {
    fazis: EPITES_FAZIS,
    alszik,
    naplo,
    boltCime: "https://bolt.example",
  }
}

describe("atmenetiHiba", () => {
  it("502, 503, 504 és a hálózati hiba átmeneti", () => {
    for (const status of [502, 503, 504])
      expect(atmenetiHiba(new FetchError("x", status))).toBe(true)
    expect(atmenetiHiba(halozati())).toBe(true)
  })

  it("egy 4xx akkor sem, ha a szövege bolt-kiesésnek hangzik", () => {
    expect(atmenetiHiba(new FetchError("Not Found", 404))).toBe(false)
    expect(atmenetiHiba(new FetchError("Service Unavailable", 401))).toBe(false)
    expect(atmenetiHiba(new TypeError("Cannot read properties"))).toBe(false)
  })
})

describe("epitesKozbenUjraprobal", () => {
  it("build közben egy 502 után újrapróbál, és a válasz megjön", async () => {
    const o = opciok()
    const hivas = proba([() => new FetchError("Bad Gateway", 502), () => "ok"])
    await expect(
      epitesKozbenUjraprobal(hivas, { url: "/store/products?handle=x" }, o),
    ).resolves.toBe("ok")
    expect(hivas).toHaveBeenCalledTimes(2)
    expect(o.alszik).toHaveBeenCalledWith(2_000)
    expect(o.naplo.mock.calls[0]![0]).toContain("/store/products?handle=x")
  })

  it("hálózati hibánál is újrapróbál", async () => {
    const o = opciok()
    const hivas = proba([halozati, halozati, () => "ok"])
    await expect(epitesKozbenUjraprobal(hivas, { url: "/u" }, o)).resolves.toBe(
      "ok",
    )
    expect(o.alszik.mock.calls.map(([ms]) => ms)).toEqual([2_000, 4_000])
  })

  it("futásidőben nem próbál újra: egyszer hív, és a hiba azonnal megy", async () => {
    const o = { ...opciok(), fazis: "phase-production-server" }
    const hivas = proba([() => new FetchError("Bad Gateway", 502)])
    await expect(
      epitesKozbenUjraprobal(hivas, { url: "/u" }, o),
    ).rejects.toThrow("Bad Gateway")
    expect(hivas).toHaveBeenCalledTimes(1)
    expect(o.alszik).not.toHaveBeenCalled()
  })

  it("fázis nélkül (böngésző, teszt) sem próbál újra", async () => {
    const o = { ...opciok(), fazis: undefined }
    vi.stubEnv("NEXT_PHASE", "")
    const hivas = proba([() => new FetchError("Bad Gateway", 502)])
    await expect(
      epitesKozbenUjraprobal(hivas, { url: "/u" }, o),
    ).rejects.toThrow()
    expect(hivas).toHaveBeenCalledTimes(1)
    vi.unstubAllEnvs()
  })

  it("egy 404 build közben is azonnal bukik", async () => {
    const o = opciok()
    const hivas = proba([() => new FetchError("Not Found", 404)])
    await expect(
      epitesKozbenUjraprobal(hivas, { url: "/u" }, o),
    ).rejects.toThrow("Not Found")
    expect(hivas).toHaveBeenCalledTimes(1)
  })

  it("POST-ot nem ismétel", async () => {
    const o = opciok()
    const hivas = proba([() => new FetchError("Bad Gateway", 502)])
    await expect(
      epitesKozbenUjraprobal(hivas, { method: "post", url: "/store/carts" }, o),
    ).rejects.toThrow()
    expect(hivas).toHaveBeenCalledTimes(1)
  })

  it("a keret kimerül: öt várakozás után a hiba továbbmegy, megnevezve", async () => {
    const o = opciok()
    const hivas = proba([() => new FetchError("Bad Gateway", 502)])
    await expect(
      epitesKozbenUjraprobal(
        hivas,
        { url: "/store/product-categories?handle=triton" },
        o,
      ),
    ).rejects.toThrow("Bad Gateway")
    expect(hivas).toHaveBeenCalledTimes(6)
    expect(o.alszik.mock.calls.map(([ms]) => ms)).toEqual([
      2_000, 4_000, 8_000, 16_000, 30_000,
    ])
    const utolso = o.naplo.mock.calls.at(-1)![0] as string
    expect(utolso).toContain("A BOLT NEM VALASZOL (https://bolt.example)")
    expect(utolso).toContain("/store/product-categories?handle=triton")
    expect(utolso).toContain("60 mp")
    expect(utolso).toContain("EZ NEM KOD-HIBA")
  })
})

describe("feladasUzenet", () => {
  it("megnevezi az utolsó hiba státuszát", () => {
    expect(feladasUzenet("/u", new FetchError("Bad Gateway", 502))).toContain(
      "HTTP 502 Bad Gateway",
    )
  })
})
