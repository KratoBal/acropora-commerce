// @vitest-environment node
import { readFileSync } from "node:fs"
import { createRequire } from "node:module"

import { chromium, type Browser, type Page } from "playwright-core"
import {
  afterAll,
  beforeAll,
  describe,
  expect,
  it,
  type TestContext,
} from "vitest"

import { mintak, type Minta } from "@lib/seo/html-szerzodes/mintaoldalak"

import { A11Y_VARHATO, a11yVarhato } from "./a11y-varhato"
import { allomasMost, vezerlokMost, type Allomas } from "./billentyuzet"
import { tesztKosar, type KosarAllapot } from "./teszt-kosar"

/**
 * AKADALYMENTESSEG A MINTAOLDALAKON ES A PENZTAR-UTON (SEO frontend FE-9).
 *
 * VALODI BONGESZOBEN fut (fej nelkuli Chromium, `playwright-core`), mert a
 * kontraszt, a lathatosag es a fokusz-stilus a szamolt CSS-bol all; a jsdom
 * ezeket nem latja. Ket resz:
 * - axe (WCAG 2.0/2.1/2.2 A es AA, plusz best-practice) a mintaoldalakon, a
 *   kosaron es a penztar harom lepesen;
 * - billentyuzetes bejaras a penztar lepesein: minden lathato vezerlo elerheto-e
 *   Tab-bal, minden allomason LATSZIK-e a fokusz, van-e neve, es kijut-e a lanc.
 *
 * A penztarhoz egy teszt-kosar kell (`teszt-kosar.ts`, csak a teszt boltban).
 *
 * KIMENET: zold; piros (uj hiba, vagy egy ismert hiba mar eltunt: vedd ki az
 * `a11y-varhato.ts`-bol); kihagyott (ismert hiba, a gazdaval).
 */
const ALAP = process.env.SEO_BASE_URL?.replace(/\/$/, "")
const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const KULCS = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const ORSZAG = process.env.NEXT_PUBLIC_DEFAULT_REGION || "hu"
if (!ALAP || !BACKEND || !KULCS)
  throw new Error(
    "SEO_BASE_URL, NEXT_PUBLIC_MEDUSA_BACKEND_URL és NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY kell",
  )

const AXE_FORRAS = readFileSync(
  createRequire(import.meta.url).resolve("axe-core/axe.min.js"),
  "utf8",
)
const AXE_CIMKEK = [
  "wcag2a",
  "wcag2aa",
  "wcag21a",
  "wcag21aa",
  "wcag22aa",
  "best-practice",
]

/** A mintaoldal-tipusok, amiken az axe fut (a teljes FE-8 keszletbol). */
const MINTA_LAPOK: Record<string, Minta["tipus"]> = {
  kezdolap: "kezdolap",
  termek: "termek-gtin-nelkul",
  kategoria: "kategoria-level",
  marka: "marka",
  kereses: "kereses",
}
const PENZTAR_LEPESEK = {
  "penztar-cim": "address",
  "penztar-szallitas": "delivery",
  "penztar-fizetes": "payment",
} as const

let bongeszo: Browser
let oldal: Page
let MINTAK: Minta[] = []
let KOSAR: KosarAllapot = { kosarId: null, ok: "még nem készült" }

beforeAll(async () => {
  bongeszo = await chromium.launch()
  MINTAK = await mintak({ backend: BACKEND, kulcs: KULCS, orszag: ORSZAG })
  KOSAR = await tesztKosar({ backend: BACKEND, kulcs: KULCS, orszag: ORSZAG })
  console.log("TESZT-KOSÁR:", KOSAR.kosarId ?? KOSAR.ok)
  const ctx = await bongeszo.newContext({
    viewport: { width: 1280, height: 900 },
  })
  if (KOSAR.kosarId)
    await ctx.addCookies([
      { name: "_medusa_cart_id", value: KOSAR.kosarId, url: ALAP },
    ])
  oldal = await ctx.newPage()
})
afterAll(async () => {
  await bongeszo?.close()
})

/** A lap utja, vagy a kihagyas oka. */
function utja(lap: string): { ut: string } | { ok: string } {
  if (lap in MINTA_LAPOK) {
    const m = MINTAK.find((x) => x.tipus === MINTA_LAPOK[lap])
    return m?.ut ? { ut: m.ut } : { ok: `nincs minta: ${m?.hianyzik}` }
  }
  if (KOSAR.kosarId === null) return { ok: `nincs teszt-kosár: ${KOSAR.ok}` }
  if (lap === "kosar") return { ut: `/${ORSZAG}/cart` }
  const lepes = PENZTAR_LEPESEK[lap as keyof typeof PENZTAR_LEPESEK]
  return KOSAR.lepesek.includes(lepes)
    ? { ut: `/${ORSZAG}/checkout?step=${lepes}` }
    : { ok: `a teszt-kosár nem jutott el a(z) ${lepes} lépésig` }
}

async function megnyit(ut: string) {
  const valasz = await oldal.goto(`${ALAP}${ut}`, { waitUntil: "networkidle" })
  expect(valasz?.status(), ut).toBe(200)
}

const kihagyottak: string[] = []

/**
 * A talalt hibak es az ismert lista ket iranyu osszevetese. A `talalt` a
 * szabaly -> elso hely terkep, a `kritikus` az axe `impact: "critical"`
 * szabalyai.
 *
 * KRITIKUS HIBA NEM LEHET ISMERT (barracuda atvetele, #523; a Launch Audit
 * feltetele: "axe: 0 kritikus a mintaoldalakon"). Ha a lista egy kritikus
 * szabalyt kihagyottkent fogadna el, a "0 kritikus" a kimenetbol gepileg nem
 * lenne eldontheto. Ezert egy kritikus talalat MINDIG piros, akkor is, ha a
 * listan all.
 */
function osszevet(
  ctx: TestContext,
  lap: string,
  talalt: Map<string, string>,
  ismertKor: (sz: string) => boolean,
  kritikus: ReadonlySet<string> = new Set(),
) {
  // minden talalt hiba a kimenetbe, laponkent: a CI naplojabol ez a hibalista
  console.log(
    `[${lap}] ${talalt.size} szabály:\n` +
      Array.from(talalt)
        .map(([sz, h]) => `    ${sz}: ${h}`)
        .join("\n"),
  )
  const uj: string[] = []
  const ismert: string[] = []
  for (const [szabaly, hol] of Array.from(talalt)) {
    const v = a11yVarhato(lap, szabaly)
    if (v) {
      ismert.push(szabaly)
      kihagyottak.push(`${lap} / ${szabaly}: ${v.gazda}, ${v.ok} (${hol})`)
    } else uj.push(`${szabaly}: ${hol}`)
  }
  const eltunt = A11Y_VARHATO.filter(
    (v) => v.lap === lap && ismertKor(v.szabaly) && !talalt.has(v.szabaly),
  ).map((v) => v.szabaly)
  expect(
    Array.from(kritikus).filter((sz) => talalt.has(sz)),
    `kritikus axe-hiba a(z) ${lap} lapon (az ismert listán sem állhat)`,
  ).toEqual([])
  expect(uj, `új hiba a(z) ${lap} lapon`).toEqual([])
  expect(
    eltunt,
    `már nincs a lapon, vedd ki az a11y-varhato.ts-ből (${lap})`,
  ).toEqual([])
  if (ismert.length) ctx.skip(`ISMERT: ${ismert.join(", ")}`)
}

const LAPOK = [
  ...Object.keys(MINTA_LAPOK),
  "kosar",
  ...Object.keys(PENZTAR_LEPESEK),
]

describe("axe (WCAG A/AA és best-practice)", () => {
  for (const lap of LAPOK) {
    it(lap, async (ctx) => {
      const hol = utja(lap)
      if ("ok" in hol) {
        kihagyottak.push(`${lap}: ${hol.ok}`)
        return ctx.skip(hol.ok)
      }
      await megnyit(hol.ut)
      await oldal.addScriptTag({ content: AXE_FORRAS })
      const eredmeny = await oldal.evaluate(
        async (cimkek) =>
          (
            await (
              window as unknown as {
                axe: {
                  run: (
                    d: Document,
                    o: unknown,
                  ) => Promise<{
                    violations: {
                      id: string
                      impact: string | null
                      nodes: { target: string[] }[]
                    }[]
                  }>
                }
              }
            ).axe.run(document, {
              runOnly: { type: "tag", values: cimkek },
              resultTypes: ["violations"],
            })
          ).violations.map((v) => [
            v.id,
            `${v.nodes.length}× ${v.nodes[0]?.target.join(" ")} [${v.impact}]`,
            v.impact,
          ]),
        AXE_CIMKEK,
      )
      const sorok = eredmeny as [string, string, string | null][]
      osszevet(
        ctx,
        lap,
        new Map(sorok.map(([id, hol]) => [id, hol])),
        (sz) => !sz.startsWith("bill:"),
        new Set(sorok.filter(([, , i]) => i === "critical").map(([id]) => id)),
      )
    })
  }
})

describe("billentyűzet a pénztár-úton", () => {
  for (const lap of Object.keys(PENZTAR_LEPESEK)) {
    it(lap, async (ctx) => {
      const hol = utja(lap)
      if ("ok" in hol) {
        kihagyottak.push(`${lap} (billentyűzet): ${hol.ok}`)
        return ctx.skip(hol.ok)
      }
      await megnyit(hol.ut)
      const vezerlok = await oldal.evaluate(vezerlokMost)
      const allomasok: Allomas[] = []
      let kijutott = false
      for (let i = 0; i < 120; i++) {
        await oldal.keyboard.press("Tab")
        const a = await oldal.evaluate(allomasMost)
        if (!a || (allomasok.length && a.cimke === allomasok[0]!.cimke)) {
          kijutott = true
          break
        }
        allomasok.push(a)
      }
      const elert = new Set(allomasok.map((a) => a.cimke))
      const talalt = new Map<string, string>()
      const lathatatlan = allomasok
        .filter((a) => !a.lathato)
        .map((a) => a.cimke)
      const nevtelen = allomasok.filter((a) => !a.nev).map((a) => a.cimke)
      const elerhetetlen = vezerlok.filter((v) => !elert.has(v))
      if (lathatatlan.length)
        talalt.set(
          "bill:lathato-fokusz",
          Array.from(new Set(lathatatlan)).join(", "),
        )
      if (nevtelen.length)
        talalt.set("bill:nev", Array.from(new Set(nevtelen)).join(", "))
      if (elerhetetlen.length)
        talalt.set(
          "bill:elerheto",
          Array.from(new Set(elerhetetlen)).join(", "),
        )
      if (!kijutott)
        talalt.set(
          "bill:csapda",
          `${allomasok.length} lépés után sem jutott ki`,
        )
      expect(allomasok.length, "egyetlen Tab-állomás sincs").toBeGreaterThan(0)
      osszevet(ctx, lap, talalt, (sz) => sz.startsWith("bill:"))
    })
  }
})

describe("összegzés", () => {
  it("az ismert (kihagyott) hibák", () => {
    console.log(
      `\nISMERT AKADÁLYMENTESSÉGI HIBÁK (${kihagyottak.length}):\n` +
        kihagyottak.map((s) => `  - ${s}`).join("\n"),
    )
  })
})
