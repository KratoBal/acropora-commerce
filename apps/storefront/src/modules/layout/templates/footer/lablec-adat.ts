import { JOGI_DOKUMENTUMOK, jogiOldal } from "@lib/util/fogyasztobarat"
import { lablecHtml } from "@lib/util/lablec-html"
import { biztonsagosCim } from "@modules/kezdolap/szovegek"
import type {
  KezdolapLablec,
  KezdolapTartalom,
} from "@modules/kezdolap/tartalom"
import {
  OSZLOP_CIMEK,
  OSZLOP_SORREND,
  REGI_BOLT_HIVATKOZASOK,
  SAJAT_HIVATKOZASOK,
} from "./hivatkozasok"

export type LablecLink = {
  cimke: string
  href: string
  /** Sajat (bolti) utvonal: az orszagkodot a `LocalizedClientLink` teszi ele. */
  sajat: boolean
}

export type LablecOszlopAdat = {
  azonosito: string
  cim: string
  linkek: LablecLink[]
}

export type LablecAdat = {
  /** Az OS bemutatkozasa, MAR tisztitva; `null`: nincs. */
  bemutatkozo: string | null
  oszlopok: LablecOszlopAdat[]
  kozossegi: Array<{ nev: string; href: string }>
  /** Az also sor szovege; `null`: a lap alapja ("(c) ev bolt. Minden jog fenntartva."). */
  alsoSor: string | null
}

const INFORMACIOK = "informaciok"

const kulcs = (cim: string) =>
  cim
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "")

/** A lap sajat, szerkesztetlen lablece: ugyanaz, mint az OS-es szerkesztes elott. */
function alapOszlopok(): LablecOszlopAdat[] {
  return OSZLOP_SORREND.flatMap((oszlop) => {
    const linkek: LablecLink[] = [
      ...SAJAT_HIVATKOZASOK.filter((h) => h.oszlop === oszlop).map((h) => ({
        cimke: h.cimke,
        href: h.cim,
        sajat: true,
      })),
      ...REGI_BOLT_HIVATKOZASOK.filter((h) => h.oszlop === oszlop).map((h) => ({
        cimke: h.cimke,
        href: h.cim,
        sajat: false,
      })),
    ]
    return linkek.length === 0
      ? []
      : [{ azonosito: oszlop, cim: OSZLOP_CIMEK[oszlop], linkek }]
  })
}

const JOGI_LINKEK: LablecLink[] = JOGI_DOKUMENTUMOK.map((d) => ({
  cimke: d.cim,
  href: jogiOldal(d.slug),
  sajat: true,
}))

/**
 * A REKORD LABLECE, HA AZ ALAKJA ERVENYES. A bolt validatora ezt amugy is
 * megkoveteli, de a lap nem bizik benne (elonezet-protokoll v1): ami nem illik,
 * azt ugy kezeli, mintha nem lenne beallitva (a lap sajat lablece all).
 */
function ervenyesLablec(adat: unknown): KezdolapLablec | null {
  if (!adat || typeof adat !== "object") return null
  const l = adat as Partial<KezdolapLablec>
  if (typeof l.intro !== "string" || typeof l.bottom_text !== "string")
    return null
  if (!l.social || typeof l.social !== "object") return null
  if (!Array.isArray(l.columns)) return null
  for (const oszlop of l.columns) {
    if (!oszlop || typeof oszlop.title !== "string") return null
    if (!Array.isArray(oszlop.links)) return null
    for (const link of oszlop.links)
      if (
        !link ||
        typeof link.label !== "string" ||
        typeof link.href !== "string"
      )
        return null
  }
  return l as KezdolapLablec
}

/**
 * A SZERKESZTETT OSZLOPOK, A JOGI DOKUMENTUMOKKAL. Az ASZF-et es az
 * adatkezelest az OS NEM szerkesztheti (jogi kotelezettseg, nautilus 36013): a
 * lap mindig maga teszi hozza oket az "Informaciok" oszlophoz, ha ilyen nincs,
 * ujat nyit. A szerkesztett linkek kozul csak a biztonsagos cimuek maradnak.
 */
function szerkesztettOszlopok(l: KezdolapLablec): LablecOszlopAdat[] {
  const oszlopok: LablecOszlopAdat[] = l.columns.map((oszlop, i) => ({
    azonosito: `szerk-${i + 1}`,
    cim: oszlop.title,
    linkek: oszlop.links.flatMap((link) => {
      const cim = biztonsagosCim(link.href)
      return cim
        ? [{ cimke: link.label, href: cim.href, sajat: !cim.kulso }]
        : []
    }),
  }))
  // A bolt es az OS ugyanazt a szabalyt tartja: az oszlop cime lehet ures
  // (csak a hossz korlatos). Cim es hivatkozas nelkuli oszlopot nem rajzolunk:
  // ures fejlec ures lista folott nem tartalom.
  //
  // A JOGI LINK MINDIG A SAJAT, HIVATALOS FELIRATAVAL all (barracuda, #565):
  // az OS oszlopaibol kiesik minden link, ami ugyanarra a jogi cimre mutat
  // (mas felirattal is), mert egy "Blog" felirattal kitett ASZF-link nem ASZF-nek
  // latszana, egy "ASZF masolat" pedig elfedne a hivatalos feliratot.
  const jogiCimek = new Set(JOGI_LINKEK.map((l) => l.href))
  for (const oszlop of oszlopok)
    oszlop.linkek = oszlop.linkek.filter((l) => !jogiCimek.has(l.href))
  const lathato = oszlopok.filter((o) => o.cim.trim() !== "" || o.linkek.length)
  const info = lathato.find((o) => kulcs(o.cim) === INFORMACIOK)
  const cel =
    info ??
    ({
      azonosito: INFORMACIOK,
      cim: OSZLOP_CIMEK.informaciok,
      linkek: [],
    } satisfies LablecOszlopAdat)
  cel.linkek.push(...JOGI_LINKEK)
  return info ? lathato : [...lathato, cel]
}

const KOZOSSEGI = [
  ["facebook", "Facebook"],
  ["instagram", "Instagram"],
  ["youtube", "YouTube"],
] as const

/**
 * A LABLEC ADATA. Szerkesztes NELKUL (a rekordban nincs `footer`, vagy az alakja
 * serult) PONTOSAN a mai lablec. Szerkesztve: a bemutatkozas (tisztitva), az OS
 * oszlopai a jogi dokumentumokkal, a kozossegi cimek, az also sor.
 *
 * A CEGES OSZLOP NINCS AZ ADATBAN: FIX (Balazs, 2026-10-27, kirakat-lablec-kep:
 * "ha valtozik, mi irjuk at"). A keret a `CEG`-et rajzolja, az OS semmilyen
 * szovege nem irja felul. Korabban a cim es a nyitvatartas az "A boltunk"
 * szovegeibol jott; az a dontes ezzel megszunt.
 */
export function lablecAdat(tartalom: KezdolapTartalom | null): LablecAdat {
  const l = ervenyesLablec(tartalom?.footer)
  if (!l)
    return {
      bemutatkozo: null,
      oszlopok: alapOszlopok(),
      kozossegi: [],
      alsoSor: null,
    }

  const bemutatkozo = lablecHtml(l.intro)
  const alsoSor = l.bottom_text.trim()

  return {
    bemutatkozo: bemutatkozo === "" ? null : bemutatkozo,
    oszlopok: szerkesztettOszlopok(l),
    kozossegi: KOZOSSEGI.flatMap(([mezo, nev]) => {
      const ertek = l.social[mezo]
      const biztonsagos =
        typeof ertek === "string" ? biztonsagosCim(ertek) : null
      return biztonsagos?.kulso ? [{ nev, href: biztonsagos.href }] : []
    }),
    alsoSor: alsoSor === "" ? null : alsoSor,
  }
}
