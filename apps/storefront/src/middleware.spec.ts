// @vitest-environment node
import { NextRequest } from "next/server"
import { afterEach, describe, expect, it, vi } from "vitest"

import { config } from "./middleware"

/**
 * A MIDDLEWARE VALODI VALASZA (FE-6, barracuda atvetele, #518).
 *
 * A tiszta fuggveny tesztje (`orszag-atiranyitas.spec.ts`) nem latja, mit ad at
 * a middleware: ha valaki itt visszairna a 307-et, vagy rossz szamot adna at,
 * az a spec zold maradna. Ez a spec a middleware-t futtatja egy kifigurazott
 * regio-lekeressel, es a valasz statuszat es `Location`-jet nezi.
 *
 * MI PIROSIT: egy orszagnal az ismert lap nem 301 (vagy elveszti a query
 * stringet); egy rossz orszagkodu ut 301-et kap; a `_next/data` atiranyitodik.
 */
const BACKEND = "http://medusa.test"

function regiok(orszagok: string[]) {
  return {
    regions: [
      {
        id: "reg_1",
        countries: orszagok.map((iso_2) => ({ iso_2 })),
      },
    ],
  }
}

async function futtat(ut: string, orszagok: string[] = ["hu"]) {
  vi.resetModules()
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", BACKEND)
  vi.stubEnv("NEXT_PUBLIC_DEFAULT_REGION", "hu")
  const lekeres = vi.fn(async () => Response.json(regiok(orszagok)))
  vi.stubGlobal("fetch", lekeres)
  const { middleware } = await import("./middleware")
  const valasz = await middleware(new NextRequest(`https://bolt.test${ut}`))
  return { valasz, lekeres }
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("a middleware átirányítása", () => {
  it("egy ország, ismert lap: 301 az országos címre, a query stringgel", async () => {
    const { valasz, lekeres } = await futtat("/products/hanna?v_id=1")
    expect(lekeres).toHaveBeenCalledOnce()
    expect(valasz.status).toBe(301)
    expect(valasz.headers.get("location")).toBe(
      "https://bolt.test/hu/products/hanna?v_id=1",
    )
  })

  it("egy ország, a gyökér: 301 a /hu-ra", async () => {
    const { valasz } = await futtat("/")
    expect(valasz.status).toBe(301)
    expect(valasz.headers.get("location")).toBe("https://bolt.test/hu")
  })

  it("ismeretlen országkód: nem 301 (307), mert a cél nem létező lap", async () => {
    const { valasz } = await futtat("/de/termek")
    expect(valasz.status).toBe(307)
    expect(valasz.headers.get("location")).toBe(
      "https://bolt.test/hu/de/termek",
    )
  })

  it("több ország: 307 az ismert lapra is", async () => {
    const { valasz } = await futtat("/products/hanna", ["hu", "at"])
    expect(valasz.status).toBe(307)
  })

  it("országkóddal kezdődő út: nincs átirányítás", async () => {
    const { valasz } = await futtat("/hu/products/hanna")
    expect(valasz.headers.get("location")).toBeNull()
    expect(valasz.headers.get("x-middleware-next")).toBe("1")
  })

  /*
   * A matcher ezt nem tudja kizarni (a Next minden matcher ele `_next/data`
   * elotagot tesz, es a `nextUrl.pathname`-bol levagja), tehat a middleware
   * MEGKAPJA. Itt az all, hogy nem iranyitja at, es a regiokat sem kerdezi.
   * A `/products/...` alak a legkozelebbi tevesztes: levagva ismert lap, es
   * 301-et kapna.
   */
  it("a _next/data: a middleware nem irányítja át", async () => {
    const { valasz, lekeres } = await futtat(
      "/_next/data/b1/products/hanna.json",
    )
    expect(valasz.headers.get("location")).toBeNull()
    expect(valasz.headers.get("x-middleware-next")).toBe("1")
    expect(lekeres).not.toHaveBeenCalled()
  })
})

/**
 * A MIDDLEWARE ATIRANYITASA ES A STATIKUS FAJLOK.
 *
 * A middleware minden utat, amit a `matcher` lefed, orszagkodos utra iranyit.
 * Egy `public/` alatti fajl csak akkor jut el a vevohoz, ha az utja a kizart
 * ELOTAGOK egyikevel kezdodik (`images`, `assets`, ...): a `.png` vegzodes
 * nem eleg. Merve a teszt kirakaton 2026-09-29: egy `/<mappa>/...png` 307-tel
 * a `/hu/<mappa>/...` utra ment, es ott 404 lett.
 *
 * MI PIROSIT: ha egy `images` alatti statikus fajl utja a middleware ala esik.
 */
const lefedi = (ut: string) =>
  config.matcher.some((minta) => new RegExp(`^${minta}$`).test(ut))

describe("a middleware és a statikus fájlok", () => {
  it("egy images alatti kép útja nem esik az átirányítás alá", () => {
    expect(lefedi("/images/kartyak.png")).toBe(false)
  })

  it("a minta tényleg átirányít egy oldalt és egy előtag nélküli képet (a mérés kontrollja)", () => {
    expect(lefedi("/checkout")).toBe(true)
    expect(lefedi("/kepek/kartyak.png")).toBe(true)
  })
})

describe("a régi címek 301-e (SEO P0 PR 7c)", () => {
  async function futtatListaval(
    ut: string,
    redirects: unknown = { redirects: [["/pumpa", "/hu/termek/p", 301]] },
  ) {
    vi.resetModules()
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", BACKEND)
    vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "pk_teszt")
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_REGION", "hu")
    const lekeres = vi.fn(async (url: string | URL) =>
      String(url).endsWith("/store/redirects")
        ? redirects instanceof Response
          ? redirects
          : Response.json(redirects)
        : Response.json(regiok(["hu"])),
    )
    vi.stubGlobal("fetch", lekeres)
    const { middleware } = await import("./middleware")
    return middleware(new NextRequest(`https://bolt.test${ut}`))
  }

  it("a régi cím egyetlen 301-gyel a célra, az országkód előtt, a query-vel", async () => {
    const valasz = await futtatListaval("/Pumpa/?utm_source=x")
    expect(valasz.status).toBe(301)
    expect(valasz.headers.get("location")).toBe(
      "https://bolt.test/hu/termek/p?utm_source=x",
    )
    expect(valasz.headers.get("cache-control")).toBe("public, max-age=86400")
  })

  it("ismeretlen út: a mai viselkedés (országkód-átirányítás)", async () => {
    const valasz = await futtatListaval("/products/hanna")
    expect(valasz.headers.get("location")).toBe(
      "https://bolt.test/hu/products/hanna",
    )
  })

  it("ha a lista nem töltődik be, nincs átirányítás a régi címre", async () => {
    const valasz = await futtatListaval(
      "/Pumpa",
      new Response("x", { status: 503 }),
    )
    // a régi cím a mai úton megy (országkód, 307), nem a lista célja felé
    expect(valasz.status).toBe(307)
    expect(valasz.headers.get("location")).toBe("https://bolt.test/hu/Pumpa")
  })
})
