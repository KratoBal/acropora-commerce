// @vitest-environment node
import { NextRequest } from "next/server"
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

/*
  A MIDDLEWARE: KI KAP SUTIT, ES MILYEN FEJLECCEL (FE-7 3. resz; barracuda
  vegleges review, acrobot 27511). MI PIROSIT: egy allapot nelkuli latogato
  `Set-Cookie`-t kap (a publikus lap nem CDN-tarolhato); a kosaras latogato
  `Set-Cookie`-s valasza gyorsitotarazhato marad (kozbulso tar ugyanazt a
  cache-azonositot adna ki mindenkinek); a belso ut kivulrol atjut.

  A Next a middleware fejlecet ISR-lapon is megtartja: ezt a helyi epitesen
  curl-lel mertuk (2026-10-07, `private, no-store` + `Set-Cookie`, HIT mellett);
  ez a spec a middleware sajat dontesere mer.
*/
beforeAll(() => {
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_BACKEND_URL", "https://bolt.example.test")
  vi.stubEnv("NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY", "pk_kitalalt")
  vi.stubEnv("NEXT_PUBLIC_DEFAULT_REGION", "hu")
  vi.stubGlobal(
    "fetch",
    vi.fn(async () =>
      Response.json({
        regions: [{ id: "reg_kitalalt", countries: [{ iso_2: "hu" }] }],
      }),
    ),
  )
})

afterAll(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

const keres = (ut: string, suti?: string) =>
  new NextRequest(new URL(ut, "https://kirakat.example.test"), {
    headers: suti ? { cookie: suti } : {},
  })

const futtat = async (ut: string, suti?: string) => {
  const { middleware } = await import("./middleware")
  return middleware(keres(ut, suti))
}

describe("a middleware a cache-sütiről", () => {
  it("állapot nélküli látogató: nincs süti, nincs fejléc", async () => {
    const v = await futtat("/hu/store")
    expect(v.headers.get("set-cookie")).toBeNull()
    expect(v.headers.get("cache-control")).toBeNull()
  })

  it("kosaras látogató: süti, és a válasz private, no-store", async () => {
    const v = await futtat("/hu/store", "_medusa_cart_id=cart_kitalalt")
    expect(v.headers.get("set-cookie")).toContain("_medusa_cache_id=")
    expect(v.headers.get("cache-control")).toBe("private, no-store")
  })

  it("akinek már van, nem kap újat, és a lap gyorsítótárazható marad", async () => {
    const v = await futtat(
      "/hu/store",
      "_medusa_cart_id=cart_kitalalt; _medusa_cache_id=meglevo",
    )
    expect(v.headers.get("set-cookie")).toBeNull()
    expect(v.headers.get("cache-control")).toBeNull()
  })

  it("a belső út kívülről 404, kódolva is", async () => {
    expect((await futtat("/hu/_p/2/store")).status).toBe(404)
    expect((await futtat("/hu/%5Fv/variant_x/termek/h")).status).toBe(404)
  })
})
