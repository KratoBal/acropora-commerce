// @vitest-environment node
import { readdirSync, readFileSync, statSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

/*
  A KEPOPTIMALIZALO ENGEDELYEI (FE-3; barracuda #525 review). A `/_next/image`
  azt tolti le es meretezi at a sajat `sharp`-unkkal, amit a `remotePatterns`
  enged: egy tag minta nyilt kepproxy, a port nelkuli `localhost` SSRF-felulet.

  MI PIROSIT: visszakerul egy S3-joker vagy a feltetel nelkuli `localhost`; a
  hatter hosztja tobbet nyit, mint a `/static/**`; eltunik a `qualities`
  korlat; egy komponens olyan minoseget ker, ami nincs a listan (az a kepet
  400-zal buktatna).
*/
const GYOKER = join(__dirname, "..", "..", "..")
const betolt = createRequire(join(GYOKER, "package.json"))

const konfig = (env: Record<string, string | undefined>) => {
  for (const [k, v] of Object.entries(env)) vi.stubEnv(k, v as string)
  const ut = betolt.resolve("./next.config.js")
  delete betolt.cache[ut]
  delete betolt.cache[betolt.resolve("./check-env-variables")]
  return betolt(ut).images as {
    remotePatterns: Record<string, string>[]
    qualities?: number[]
  }
}

const ALAP = {
  NEXT_PUBLIC_MEDUSA_BACKEND_URL: "https://commerce-stage.example.test",
  NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY: "pk_helyi_proba_nem_valodi",
  MEDUSA_CLOUD_S3_HOSTNAME: "",
  MEDUSA_CLOUD_S3_PATHNAME: "",
}

afterEach(() => vi.unstubAllEnvs())

describe("a képoptimalizáló hosztjai", () => {
  it("élesben csak a háttér /static útja", () => {
    expect(konfig({ ...ALAP, NODE_ENV: "production" }).remotePatterns).toEqual([
      {
        protocol: "https",
        hostname: "commerce-stage.example.test",
        pathname: "/static/**",
      },
    ])
  })

  it("fejlesztésben a localhost is, élesben soha", () => {
    const fejl = konfig({ ...ALAP, NODE_ENV: "development" }).remotePatterns
    expect(fejl).toContainEqual({ protocol: "http", hostname: "localhost" })
    const eles = konfig({ ...ALAP, NODE_ENV: "production" }).remotePatterns
    expect(eles.some((m) => m.hostname === "localhost")).toBe(false)
  })

  it("S3 csak pontos hoszttal és úttal, joker soha", () => {
    const m = konfig({
      ...ALAP,
      NODE_ENV: "production",
      MEDUSA_CLOUD_S3_HOSTNAME: "bolt.s3.eu-central-1.amazonaws.com",
      MEDUSA_CLOUD_S3_PATHNAME: "/kepek/**",
    }).remotePatterns
    expect(m).toContainEqual({
      protocol: "https",
      hostname: "bolt.s3.eu-central-1.amazonaws.com",
      pathname: "/kepek/**",
    })
    expect(m.some((x) => x.hostname.includes("*"))).toBe(false)
  })

  it("a minőség csak 50 vagy 75", () => {
    expect(konfig({ ...ALAP, NODE_ENV: "production" }).qualities).toEqual([
      50, 75,
    ])
  })
})

describe("a komponensek a megengedett minőséget kérik", () => {
  const fajlok = (mappa: string): string[] =>
    readdirSync(mappa).flatMap((nev) => {
      const ut = join(mappa, nev)
      if (statSync(ut).isDirectory()) return fajlok(ut)
      return /\.tsx?$/.test(nev) && !/\.spec\./.test(nev) ? [ut] : []
    })

  it("minden quality érték a listán (75 az alapértelmezés)", () => {
    const kert = fajlok(join(GYOKER, "src")).flatMap((ut) =>
      Array.from(
        readFileSync(ut, "utf8").matchAll(/\bquality(?:=\{|:\s*)(\d+)/g),
      ).map((m) => Number(m[1])),
    )
    // pozitiv kontroll: a listakep 50-et ker
    expect(kert).toContain(50)
    for (const q of kert) expect([50, 75]).toContain(q)
  })
})
