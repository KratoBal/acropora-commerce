// @vitest-environment node
import { beforeAll, describe, expect, it, type TestContext } from "vitest"

import { convertToLocale } from "@lib/util/money"
import { ELES_HOSZTOK } from "@lib/util/robots-hazirend"

import { kivonat, type OldalKivonat } from "./kivonat"
import { mintak, type Minta, type MintaTipus } from "./mintaoldalak"
import { robotsEngedi } from "./robots-txt"
import { SZABALYOK, type SzabalyKulcs, type Valasz } from "./szabalyok"
import { varhato, type Varhato } from "./varhato"

/**
 * A RENDERELT HTML SEO-SZERZODESE (SEO frontend FE-8, roadmap 3/B, a 15. pont).
 *
 * EGY FUTO KIRAKAT ELLEN fut (`SEO_BASE_URL`): a CI-ben a frissen epitett
 * `next start`, kiadas utan a teszt kirakat. A kirakat elso HTML-jet meri, mert
 * azt latja a kereso -- nem a komponenst. A mintaoldalakat a bolt Store API-jabol
 * valasztja (`mintaoldalak.ts`).
 *
 * Futtatas: `SEO_BASE_URL=http://localhost:8000 pnpm --filter @dtc/storefront
 * run seo:html` (a Store API cime es kulcsa a kirakat sajat valtozoibol jon).
 *
 * HAROM KIMENET van, es mind a harom latszik a kimenetben:
 * - zold: a szabaly teljesul;
 * - piros: regresszio, VAGY egy varhato-piros mar zold (vedd ki a `varhato.ts`-bol);
 * - kihagyott: varhato-piros (a gazda PR-rel), vagy nincs minta az adatban.
 */
const ALAP = process.env.SEO_BASE_URL?.replace(/\/$/, "")
const BACKEND = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const KULCS = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const ORSZAG = process.env.NEXT_PUBLIC_DEFAULT_REGION || "hu"
if (!ALAP || !BACKEND || !KULCS)
  throw new Error(
    "SEO_BASE_URL, NEXT_PUBLIC_MEDUSA_BACKEND_URL és NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY kell",
  )

const MOBIL_UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"
const ASZTALI_UA =
  "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)"

/** Oldaltipusonkent a szabalyok (roadmap 3/B tablazata). */
const TERV: Record<MintaTipus, readonly SzabalyKulcs[]> = (() => {
  const termek: SzabalyKulcs[] = [
    "statusz-200",
    "egy-h1",
    "egy-main",
    "cim",
    "leiras",
    "canonical-onmaga",
    "indexelheto",
    "json-ld-product",
    "json-ld-breadcrumb",
    "alt",
    "fo-kep-nem-lusta",
  ]
  const kategoria: SzabalyKulcs[] = [
    "statusz-200",
    "egy-h1",
    "egy-main",
    "cim",
    "leiras",
    "canonical-onmaga",
    "indexelheto",
    "termek-linkek",
    "alt",
  ]
  const felso = kategoria.map((sz) =>
    sz === "termek-linkek" ? "alkategoria-linkek" : sz,
  )
  return {
    kezdolap: ["statusz-200", "egy-main", "cim", "leiras", "indexelheto"],
    "termek-gtin": termek,
    "termek-gtin-nelkul": termek,
    "termek-elfogyott": termek,
    "termek-valtozatos": ["statusz-200", "egy-h1"],
    "kategoria-felso": felso,
    "kategoria-level": kategoria,
    "kategoria-lap2": ["statusz-200", "egy-main", "lapozas-canonical"],
    marka: [
      "statusz-200",
      "egy-main",
      "cim",
      "leiras",
      "canonical-onmaga",
      "indexelheto",
      "termek-linkek",
      "alt",
    ],
    kereses: [
      "statusz-200",
      "egy-main",
      "cim",
      "leiras",
      "noindex",
      "canonical-alap",
    ],
    facet: ["statusz-200", "egy-main", "noindex", "canonical-alap"],
    "nem-letezo": ["statusz-404", "noindex"],
  }
})()

type Lap = { valasz: Valasz; html: string; k: OldalKivonat }
const tar = new Map<string, Promise<Lap>>()

function lap(ut: string, ua = MOBIL_UA): Promise<Lap> {
  const kulcs = `${ua}|${ut}`
  let p = tar.get(kulcs)
  if (!p) {
    p = fetch(`${ALAP}${ut}`, {
      headers: { "user-agent": ua },
      redirect: "manual",
    }).then(async (r) => {
      const html = await r.text()
      return {
        valasz: {
          ut,
          statusz: r.status,
          xRobots: r.headers.get("x-robots-tag"),
        },
        html,
        k: kivonat(html),
      }
    })
    tar.set(kulcs, p)
  }
  return p
}

const kihagyottak: string[] = []

/** Egy szabaly egy mintan, a varhato-piros ket iranyu kotesevel. */
async function ellenoriz(
  ctx: TestContext,
  minta: Minta,
  szabaly: Varhato["szabaly"],
  hibak: string[],
) {
  const v = varhato(szabaly, minta.tipus)
  if (!v) {
    expect(hibak, `${minta.ut}`).toEqual([])
    return
  }
  if (hibak.length) {
    kihagyottak.push(`${minta.tipus} / ${szabaly}: ${v.gazda}, ${v.ok}`)
    ctx.skip(`VÁRHATÓ PIROS (${v.gazda}): ${v.ok} | ${hibak[0]}`)
    return
  }
  throw new Error(
    `A(z) "${szabaly}" már zöld ezen: ${minta.ut}. Vedd ki a varhato.ts sorát (${v.gazda}), különben egy későbbi regressziója is kihagyott maradna.`,
  )
}

/*
 * A MINTAK FUTASKOR jonnek a boltbol, a tesztek viszont gyujteskor allnak ossze:
 * ezert a tesztek a TIPUSOKRA epulnek (a `TERV` kulcsai), es a futo teszt keresi
 * ki a sajat mintajat. A cim a hibauzenetben all.
 */
let MINTAK: Minta[] = []
beforeAll(async () => {
  MINTAK = await mintak({ backend: BACKEND, kulcs: KULCS, orszag: ORSZAG })
  console.log(
    "MINTAK:\n" +
      MINTAK.map(
        (m) => `  ${m.tipus}: ${m.ut ?? `(nincs: ${m.hianyzik})`}`,
      ).join("\n"),
  )
})
const mintaja = (t: MintaTipus) => MINTAK.find((m) => m.tipus === t)!

describe("a mintaoldalak", () => {
  it("a fő mintatípusokra van adat (a teszt nem üresen zöld)", () => {
    const megvan = MINTAK.filter((m) => m.ut).map((m) => m.tipus)
    for (const t of [
      "kezdolap",
      "termek-gtin-nelkul",
      "kategoria-level",
      "kereses",
    ] as const)
      expect(megvan).toContain(t)
  })
})

for (const tipus of Object.keys(TERV) as MintaTipus[]) {
  describe(tipus, () => {
    for (const szabaly of TERV[tipus]) {
      it(szabaly, async (ctx) => {
        const minta = mintaja(tipus)
        if (!minta.ut) {
          kihagyottak.push(
            `${tipus} / ${szabaly}: nincs minta (${minta.hianyzik})`,
          )
          return ctx.skip(`NINCS MINTA: ${minta.hianyzik}`)
        }
        const { k, valasz } = await lap(minta.ut)
        await ellenoriz(ctx, minta, szabaly, SZABALYOK[szabaly](k, valasz))
      })
    }
  })
}

describe("változat közvetlen URL-je (Balázs 2. pontja)", () => {
  it("a ?v_id az első HTML-ben a kért változatot mutatja", async (ctx) => {
    const minta = mintaja("termek-valtozatos")
    if (!minta.ut || !minta.valtozat) {
      const v = varhato("v-id", minta.tipus)!
      kihagyottak.push(`v_id: nincs minta (${minta.hianyzik}); ${v.gazda}`)
      ctx.skip(
        `NINCS MINTA: ${minta.hianyzik} (a kiszolgálás gazdája: ${v.gazda})`,
      )
      return
    }
    const { html } = await lap(minta.ut)
    const { sku, ar } = minta.valtozat
    const jel =
      sku ??
      (ar === null
        ? null
        : convertToLocale({ amount: ar, currency_code: "huf" }))
    await ellenoriz(
      ctx,
      minta,
      "v-id",
      jel && html.includes(jel)
        ? []
        : [`a változat jele (${jel}) nincs az első HTML-ben`],
    )
  })
})

describe("mobil és asztali Googlebot ugyanazt kapja", () => {
  for (const tipus of ["termek-gtin-nelkul", "kategoria-level"] as const) {
    it(`${tipus}`, async (ctx) => {
      const minta = mintaja(tipus)
      if (!minta?.ut) return ctx.skip("nincs minta")
      const mobil = (await lap(minta.ut, MOBIL_UA)).k
      const asztali = (await lap(minta.ut, ASZTALI_UA)).k
      const mag = (k: OldalKivonat) => ({
        h1: k.h1,
        cim: k.cim,
        leiras: k.leiras,
        canonical: k.canonical,
        robots: k.robotsMeta,
        termekLinkek: k.termekLinkek.length,
      })
      expect(mag(asztali)).toEqual(mag(mobil))
    })
  }
})

describe("robots.txt", () => {
  it("a nem éles hoszt mindent tilt", async () => {
    const hoszt = new URL(ALAP).host
    const r = await fetch(`${ALAP}/robots.txt`)
    const txt = await r.text()
    expect(r.status).toBe(200)
    if ((ELES_HOSZTOK as readonly string[]).includes(hoszt)) return
    expect(robotsEngedi(txt, `/${ORSZAG}`), txt).toBe(false)
  })
})

describe("még nincs mit mérni (a gazda PR-rel)", () => {
  it.todo(
    "régi UNAS-URL: pontosan egy 301 a várt új URL-re, a cél 200 (P0 PR 7)",
  )
  it.todo("sitemap: minden URL 200 és indexelhető, nincs ?q= és facet (FE-5)")
  it.todo(
    "üres kategória: a döntése (noindex vagy kimarad) a sitemap-típusokkal (FE-5)",
  )
  it.todo("élő állat: a bolti átvétel a JSON-LD availability-ben (FE-2)")
  it.todo("elfogyott termék: availability = OutOfStock a JSON-LD-ben (FE-2)")
})

describe("összegzés", () => {
  it("a kihagyott (várható-piros és minta nélküli) tételek listája", () => {
    // a kimenetben egy helyen, hogy a CI naplojabol ne kelljen kiszedni
    console.log(
      `\nKIHAGYOTT (${kihagyottak.length}):\n` +
        kihagyottak.map((s) => `  - ${s}`).join("\n"),
    )
  })
})
