import { readdirSync, readFileSync } from "node:fs"
import { join, relative } from "node:path"

import { describe, expect, it } from "vitest"

import { VEVOI_SZOVEG_CSOPORTOK } from "./vevoi-szoveg-katalogus"

/**
 * AZ OS-BEN ÁTÍRT VEVŐI SZÖVEG MINDEN HÍVÓHOZ ELJUT (kártya 7bfca4eb). A felülírás csak azon a fordítón át hat, amelyik megkapja:
 * szerveren a `vevoiForditas(locale)`, kliens-komponensben a `useTranslate()` / `useTranslateFor(locale)`. A csupasz
 * `translator(locale)` a szótár szövegét adja, tehát egy vevői kulcsot használó fájlban NÉMA hiba: a vevő a régi mondatot látja,
 * és semmi nem pirosodik.
 *
 * MI PIROSÍT: egy forrásfájl vevői kulcsot ír (`"checkoutPage.…"`, a katalógus csoportjainak előtagjával), és a felülírás nélküli
 * `translator(…)`-t hívja. Nem számít hívásnak az alapértékként álló `t: Translate = translator(…)` és a destruktúrált `t =
 * translator(…)`: ott a hívó adja a fordítót (a hívók kimaradását a PR egyszeri típus-bejárással mérte).
 *
 * AMIT NEM LÁT: a máshonnan érkező kulcsot (prop, másik fájl táblája). Az ilyen fájl a felülírást akkor kapja, ha a fordítója
 * jó, és ezt ez az őr nem dönti el.
 */
const SRC = join(__dirname, "../..")

/** Szándékos kivételek, okkal. */
const KIVETEL: Record<string, string> = {
  "lib/i18n/dictionary/index.ts": "a fordító maga",
  "lib/i18n/use-translate.ts": "a kliens fordító: a felülírást ő adja hozzá",
  "lib/i18n/vevoi-forditas.ts": "a szerver fordító: a felülírást ő adja hozzá",
  "lib/i18n/vevoi-szoveg-katalogus.ts":
    "a katalógus a szótárt olvassa, nem fordít",
  "lib/util/auth-hiba.ts":
    "a magyar `authHibaSzoveg` csak a spec-ben él; a vevő a `useTranslate`-es `authHibaFelirat`-ot látja",
  "lib/util/fizetesi-modok.ts":
    "a magyar `FIZETESI_SZEREP_CIMKE` és `_ALCIM` csak a spec-ben él; a pénztár a `fizetesiModCimke(mod, t)`-t hívja",
  "lib/util/szolj-hasonlo.ts":
    "a `forditas` függőség hiányában (teszt) a szótár; a szerver-akció átadja",
}

const forrasok = (dir: string): string[] =>
  readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory()
      ? forrasok(join(dir, e.name))
      : /\.tsx?$/.test(e.name) && !/\.spec\.tsx?$/.test(e.name)
        ? [join(dir, e.name)]
        : [],
  )

const elotagok = VEVOI_SZOVEG_CSOPORTOK.flatMap((c) => [...c.from])
const VEVOI_KULCS = new RegExp(`["'\`](?:${elotagok.join("|")})\\.[A-Za-z]`)

/** A felülírás nélküli fordító hívásai: minden `translator(`, ami nem alapérték. */
const csupaszHivasok = (forras: string): string[] =>
  forras
    .split("\n")
    .filter(
      (sor) =>
        /\btranslator\(/.test(sor) &&
        !/Translate = translator\(/.test(sor) &&
        !/^\s*t = translator\(/.test(sor),
    )
    .map((sor) => sor.trim())

describe("a vevői szövegek felülírása minden hívóhoz eljut", () => {
  it("vevői kulcsot használó fájl nem hívja a felülírás nélküli translator()-t", () => {
    const hibak = forrasok(SRC)
      .map((f) => ({ f: relative(SRC, f), forras: readFileSync(f, "utf8") }))
      .filter(({ f, forras }) => !KIVETEL[f] && VEVOI_KULCS.test(forras))
      .flatMap(({ f, forras }) =>
        csupaszHivasok(forras).map((sor) => `${f}: ${sor}`),
      )
    expect(hibak).toEqual([])
  })

  it("az őr lát: van vevői kulcsot használó fájl, és a kivételek léteznek", () => {
    const fajlok = forrasok(SRC).map((f) => relative(SRC, f))
    const vevoi = forrasok(SRC).filter((f) =>
      VEVOI_KULCS.test(readFileSync(f, "utf8")),
    )
    expect(vevoi.length).toBeGreaterThan(50)
    for (const f of Object.keys(KIVETEL)) expect(fajlok).toContain(f)
  })
})
