// @vitest-environment node
import { createRequire } from "node:module"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { elonezetiUt } from "@lib/util/kezdolap-elonezet"

/*
  A KIRAKAT BIZTONSAGI FEJLECEI (commerce-audit-p0, B1, P0). MI PIROSIT: ha
  barmelyik fejlec kiesik a fo szabalybol; ha a HSTS ev alatt vagy preload-dal
  megy; ha a Permissions-Policy letiltja a Foxpost kereso helymeghatarozasat
  (az iframe `allow="geolocation"`-t ker); ha az ERVENYESITETT CSP tobbet kap a
  `frame-ancestors 'self'`-nel; ha az elonezeti utvonal (OS-iframe) is megkapna
  a `frame-ancestors 'self'`-et, es ures keret latszana az OS-ben; ha a
  `poweredByHeader` visszakapcsol; ha az `headers()` nem ezt a modult hivja.

  AMIT NEM MER: hogy egy bongeszo mit csinal vele (a CSP forrasait csak egy
  valodi oldalbetoltes mutatja), es hogy a Traefik/Coolify nem ir-e felul
  valamit. Az elso a jelento mod eppen erre valo.
*/
const GYOKER = join(__dirname, "..", "..", "..")
const betolt = createRequire(join(GYOKER, "package.json"))
const { pathToRegexp } = betolt("next/dist/compiled/path-to-regexp") as {
  pathToRegexp: (s: string) => RegExp
}
const modul = betolt("./biztonsagi-fejlecek") as {
  biztonsagiFejlecek: (env: Record<string, string | undefined>) => Rule[]
}

type Rule = { source: string; headers: { key: string; value: string }[] }

const ENV = {
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: "https://commerce-stage.example.test",
}
const szabalyok = modul.biztonsagiFejlecek(ENV)

/** Egy utvonalra a Next szabalyai szerint ervenyes fejlecek (a kesobbi felulir). */
const fejlecek = (utvonal: string): Record<string, string> => {
  const ki: Record<string, string> = {}
  for (const szabaly of szabalyok)
    if (pathToRegexp(szabaly.source).test(utvonal))
      for (const { key, value } of szabaly.headers) ki[key] = value
  return ki
}

afterEach(() => vi.unstubAllEnvs())

const OLDALAK = [
  "/",
  "/hu",
  "/hu/termek/valami",
  "/hu/categories/a/b",
  "/hu/cart",
  "/hu/404",
  "/_next/static/x.js",
]

describe("a biztonsági fejlécek minden oldalon", () => {
  it.each(OLDALAK)("%s megkapja a négy alapfejlécet", (utvonal) => {
    const f = fejlecek(utvonal)
    expect(f["X-Content-Type-Options"]).toBe("nosniff")
    expect(f["Referrer-Policy"]).toBe("strict-origin-when-cross-origin")
    expect(f["Strict-Transport-Security"]).toBeDefined()
    expect(f["Permissions-Policy"]).toBeDefined()
  })

  it("a HSTS legalább egy év, aldomainekkel, preload nélkül", () => {
    const hsts = fejlecek("/hu")["Strict-Transport-Security"]!
    const kor = Number(/max-age=(\d+)/.exec(hsts)?.[1])
    expect(kor).toBeGreaterThanOrEqual(31536000)
    expect(hsts).toContain("includeSubDomains")
    expect(hsts).not.toMatch(/preload/i)
  })

  it("a kamera és a mikrofon tiltott, a Foxpost kereső helymeghatározása nem", () => {
    const pp = fejlecek("/hu")["Permissions-Policy"]!
    expect(pp).toContain("camera=()")
    expect(pp).toContain("microphone=()")
    // a foxpost-kereso iframe `allow="geolocation"`-t ker: `geolocation=()` megtorne
    expect(pp).not.toContain("geolocation=()")
    expect(pp).toContain('geolocation=(self "https://cdn.foxpost.hu")')
  })
})

describe("a CSP", () => {
  it("az érvényesített szabály csak a frame-ancestors 'self'", () => {
    expect(fejlecek("/hu/termek/valami")["Content-Security-Policy"]).toBe(
      "frame-ancestors 'self'",
    )
  })

  it("a teljes szabály csak jelentő módban megy, és nem enged eval-t", () => {
    const f = fejlecek("/hu/termek/valami")
    const jelento = f["Content-Security-Policy-Report-Only"]!
    expect(jelento).toBeDefined()
    expect(jelento).not.toContain("unsafe-eval")
    expect(jelento).toContain("object-src 'none'")
    expect(jelento).toContain("frame-ancestors 'self'")
    // a Stripe nelkul a kartyas fizetes jelentene mindent
    expect(jelento).toContain("https://js.stripe.com")
    // a hatter hosztja a kep- es a kapcsolat-forrasban
    expect(jelento).toMatch(
      /img-src [^;]*https:\/\/commerce-stage\.example\.test/,
    )
    expect(jelento).toMatch(
      /connect-src [^;]*https:\/\/commerce-stage\.example\.test/,
    )
  })

  it("érvénytelen háttércímből nem lesz forrás (nem 'undefined')", () => {
    const jelento = modul
      .biztonsagiFejlecek({ NEXT_PUBLIC_MEDUSA_BACKEND_URL: "nem cim" })
      .flatMap((s) => s.headers)
      .find((h) => h.key === "Content-Security-Policy-Report-Only")!.value
    expect(jelento).not.toContain("undefined")
    expect(jelento).not.toContain("nem cim")
  })
})

describe("az előnézeti útvonal (OS iframe)", () => {
  const ELONEZETEK = [
    "/hu/kezdolap-elonezet",
    "/en/kezdolap-elonezet/",
    "/HU/kezdolap-elonezet",
  ]

  it("a middleware előnézeti útjai pontosan azok, amelyek kimaradnak a frame-ancestors 'self'-ből", () => {
    for (const ut of ELONEZETEK) {
      // ismert pozitiv kontroll: a middleware is elonezetnek tekinti
      expect(elonezetiUt(ut), ut).toBe(true)
      const f = fejlecek(ut)
      // az alapfejlecek megvannak, a CSP-t a middleware adja (az OS cimevel)
      expect(f["X-Content-Type-Options"], ut).toBe("nosniff")
      expect(f["Content-Security-Policy"], ut).toBeUndefined()
      expect(f["Content-Security-Policy-Report-Only"], ut).toBeUndefined()
    }
  })

  it("a kivétel nem szivárog: a hasonló útvonalak megkapják a CSP-t", () => {
    for (const ut of [
      "/hu/kezdolap-elonezet/x",
      "/hu/kezdolap",
      "/hu/x/kezdolap-elonezet",
      "/kezdolap-elonezet",
    ]) {
      expect(fejlecek(ut)["Content-Security-Policy"], ut).toBe(
        "frame-ancestors 'self'",
      )
    }
  })

  it("egyetlen szabály sem tesz X-Frame-Optionst", () => {
    const kulcsok = szabalyok.flatMap((s) => s.headers.map((h) => h.key))
    expect(kulcsok).not.toContain("X-Frame-Options")
  })
})

describe("a next.config", () => {
  it("nincs X-Powered-By, és a headers() ezt a modult hívja", async () => {
    for (const [k, v] of Object.entries({
      ...ENV,
      NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_helyi_proba_nem_valodi",
      MEDUSA_CLOUD_S3_HOSTNAME: "",
      MEDUSA_CLOUD_S3_PATHNAME: "",
    }))
      vi.stubEnv(k, v)
    const ut = betolt.resolve("./next.config.js")
    delete betolt.cache[ut]
    delete betolt.cache[betolt.resolve("./check-env-variables")]
    const konfig = betolt(ut) as {
      poweredByHeader?: boolean
      headers: () => Promise<Rule[]>
    }
    expect(konfig.poweredByHeader).toBe(false)
    expect(await konfig.headers()).toEqual(
      modul.biztonsagiFejlecek(process.env),
    )
  })
})
