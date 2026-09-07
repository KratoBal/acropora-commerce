import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A KATEGORIA-LEKERDEZESEK MEZOLISTAJA -- ORZO, MERT A HIBA MA ELESBEN JELENT MEG.
 *
 * 2026-09-07 este a bolt hasznalhatatlan volt: a kategoria-lekerdezes
 * `*products`-ot is kert, es a katalogus atkoltozese ota EGY oldalbetoltes
 * kozel 144 megabajtot huzott. A Next.js 2 megabajt folott nem tud
 * gyorsitotarazni, tehat MINDEN keres ujra lehuzta. Balazs annyit latott
 * belole, hogy "No server".
 *
 * A javitas ket KULON fuggvenyt erintett, es a masodik egy oraval kesobb derult
 * ki -- azert, mert az elso javitasa utan senki nem kereste a TOBBIT:
 *
 *   listCategories (CATEGORY_FIELDS)   a 144 MB-os ut
 *   getCategoryByHandle                a gyoker kategorian 3,96 MB
 *
 * EZ AZ ALLITAS AZERT LETEZIK, MERT A KETTO KOZUL AZ EGYIK KIMARADT. Egy
 * mezolista, ami egyszer mar tulnott, masodszor is meg fog -- es a kimenet nem
 * hibauzenet, hanem lassusag, amit senki nem kot a mezolistahoz.
 *
 * A HALO HATARA: a FORRAST olvassa, nem a valaszt. Azt allitja, hogy a
 * mezolistankban nem all `*products` -- NEM azt, hogy a valasz kicsi. A meretet
 * az elo API mondja meg, es az a szam a fuggveny kommentjeben all.
 */
/**
 * A HALO A `lib/data` MINDEN FAJLJAT NEZI, NEM EGYET -- ES EZ ACROBOT KERESE.
 *
 * Az elso valtozat NEV SZERINT olvasta a `categories.ts`-t. Ettol a
 * `collections.ts` mezolistajarol SEMMIT nem allitott: egy `*products` OTT nem
 * dontott volna pirosra semmit.
 *
 * Es pontosan ez tortent: a hibat harom UTON talaltuk meg egy este alatt (a
 * kategoria-lista, a `getCategoryByHandle`, es a `getCollectionByHandle`), es a
 * harmadikat acrobot vette eszre, nem a halo.
 *
 * Ezert a halo mostantol a MAPPAT jarja be. A negyedik utat -- barmi is legyen
 * -- mar nem embernek kell megtalalnia.
 */
const ADAT_MAPPA = __dirname

const forrasFajlok = (): string[] =>
  readdirSync(ADAT_MAPPA)
    .filter((n) => n.endsWith(".ts") && !n.endsWith(".spec.ts"))
    .sort()

/** Egy fajl kommentek nelkuli forrasa. */
const kodja = (nev: string) =>
  readFileSync(join(ADAT_MAPPA, nev), "utf-8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\/\/[^\n]*/g, "")

const NYERS = readFileSync(join(ADAT_MAPPA, "categories.ts"), "utf-8")

/**
 * A KOMMENTEKET KI KELL SZURNI, ES EZT A SAJAT ORZOM TANITOTTA MEG.
 *
 * Az elso valtozat a fejlec-kommentre sult el: ott IDEZVE all a regi, hibas
 * URL (`fields=*category_children, *products, ...`), pontosan azert, hogy a
 * kovetkezo olvaso lassa, mi volt a baj. Egy dokumentacios idezet viszont NEM
 * lekerdezes -- a halo hamis pozitivet adott volna, es egy hamis riasztas utan
 * az ember az ORZOT kapcsolja ki, nem a hibat javitja.
 */
const FORRAS = NYERS.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/[^\n]*/g, "")

describe("a kategoria-lekerdezesek mezolistaja", () => {
  /** ISMERT POZITIV KONTROLL: a fajlt tenyleg beolvastuk, es tenyleg ez az. */
  it("a forrás olvasható, és kategória-lekérdezéseket tartalmaz", () => {
    expect(NYERS).toContain("product-categories")
    expect(FORRAS).toContain("fields")
  })

  /**
   * A LENYEG. A `*products` a kategoria-mezolistaban a katalogus meretevel
   * egyutt no -- ma 1492 termek, es a szam tovabb no.
   */
  it("egyetlen mezőlista sem kéri a *products mezőt", () => {
    const mezoSorok = FORRAS.split("\n").filter(
      (sor) => sor.includes("fields:") || sor.includes("fields="),
    )

    expect(mezoSorok.length).toBeGreaterThan(0)

    const vetkezok = mezoSorok.filter((sor) => sor.includes("*products"))
    expect(vetkezok).toEqual([])
  })

  /**
   * ES AMI NEM KERULHET KI: a `*category_children`. A kategoria-lap ABBOL
   * rajzolja az alkategoria-csempeket, tehat ha valaki "meg kisebbre" szuriti a
   * listat, egy URES rács marad -- ami nem hibazik, csak hianyzik.
   *
   * Ez a par masik fele: az elozo allitas azt mondja, mi NEM lehet ott, ez azt,
   * mi KELL hogy ott legyen. Egy elnyomo szabaly onmagaban tul szelesre is
   * mehet, es akkor a masik iranyban okoz kart.
   */
  /**
   * ES UGYANEZ A TELJES MAPPARA. Az elozo allitas a `categories.ts`-rol szol;
   * ez arrol, hogy EGYETLEN adat-fajl mezolistajaban sem all `*products`.
   *
   * A ketto kozul ez az, ami a NEGYEDIK utat is megfogja -- egy olyan fajlt,
   * ami ma meg nem letezik.
   */
  it("a lib/data EGYETLEN fájljának mezőlistájában sincs *products", () => {
    const vetkezok: string[] = []

    for (const nev of forrasFajlok()) {
      const kod = kodja(nev)
      for (const m of Array.from(
        kod.matchAll(/fields:\s*(["'`][^"'`]*["'`])/g),
      )) {
        if (m[1].includes("products")) vetkezok.push(`${nev}: ${m[1]}`)
      }
    }

    expect(vetkezok).toEqual([])
  })

  /** ISMERT POZITIV KONTROLL: a bejaras tenyleg lat fajlokat es mezolistakat. */
  it("a bejárás több adat-fájlt lát, és talál bennük mezőlistát", () => {
    const fajlok = forrasFajlok()
    expect(fajlok.length).toBeGreaterThan(3)

    const mezosek = fajlok.filter((n) => kodja(n).includes("fields:"))
    expect(mezosek.length).toBeGreaterThan(1)
  })

  it("a *category_children MEGMARAD, mert az alkategória-rács abból épül", () => {
    expect(FORRAS).toContain("*category_children")
  })
})
