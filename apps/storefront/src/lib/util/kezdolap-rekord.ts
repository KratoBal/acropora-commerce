import { BLOKK_KULCSOK } from "@modules/kezdolap/blokkok"
import type { KezdolapTartalom } from "@modules/kezdolap/tartalom"

/**
 * A KEZDOLAP-REKORD ELLENORZESE A KIRAKAT OLDALAN (elonezet-protokoll v1: "a
 * kirakat a rekordot UGYANAZZAL a validatorral nezi, mint az admin PUT"). A bolt
 * validatora zod-ban el a backendben (`api/admin/homepage-content/validators.ts`),
 * a kirakat masik alkalmazas, ezert ez a SZABALYOK masolata, kezzel. A ketto nem
 * csuszhat szet: a `kezdolap-rekord.spec.ts` ugyanazt a nautilus-fixturat es
 * ugyanazokat a rontasokat futtatja, mint a backend specje.
 *
 * Elutasitasnal a hivo SEMMIT nem rajzol at a rekordbol (a protokoll szerint),
 * es az elso hibat kuldi vissza az OS-nek.
 */

export type RekordEredmeny =
  { ok: true; rekord: KezdolapTartalom } | { ok: false; hiba: string }

const BOLTI_UT = /^\/(?![/\\])[^\s\\]*$/
const KULSO_CIM = /^https?:\/\/[^\s]+$/
const SZOVEG_KULCS = /^[a-z0-9][a-z0-9_.-]{0,79}$/
const HANDLE = /^[a-z0-9][a-z0-9._-]*$/

const objektum = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x)

const pontosan = (x: Record<string, unknown>, kulcsok: readonly string[]) =>
  Object.keys(x).every((k) => kulcsok.includes(k)) &&
  kulcsok.every((k) => k in x)

const szoveg = (x: unknown, max: number, min = 0): x is string =>
  typeof x === "string" && x.length <= max && x.length >= min

const boltiUt = (x: unknown): x is string =>
  typeof x === "string" && x.length <= 300 && BOLTI_UT.test(x)

const kepCim = (x: unknown): x is string =>
  typeof x === "string" &&
  x.length <= 1000 &&
  (KULSO_CIM.test(x) || BOLTI_UT.test(x))

const linkCim = (x: unknown): x is string =>
  typeof x === "string" &&
  x.length <= 500 &&
  (KULSO_CIM.test(x) || BOLTI_UT.test(x))

const SLIDE_KULCSOK = [
  "eyebrow",
  "title",
  "text",
  "cta",
  "cta_href",
  "cta2",
  "cta2_href",
  "caption",
  "caption2",
  "image_url",
  "image_alt",
] as const

function diaHiba(dia: unknown): string | null {
  if (!objektum(dia) || !pontosan(dia, SLIDE_KULCSOK))
    return "slides: dia alakja"
  const mezok: Array<[string, number]> = [
    ["eyebrow", 200],
    ["title", 300],
    ["text", 1000],
    ["cta", 100],
    ["cta2", 100],
    ["caption", 300],
    ["caption2", 300],
    ["image_alt", 300],
  ]
  for (const [k, max] of mezok) if (!szoveg(dia[k], max)) return `slides: ${k}`
  for (const k of ["cta_href", "cta2_href"])
    if (dia[k] !== null && !boltiUt(dia[k])) return `slides: ${k}`
  if (dia.image_url !== null && !kepCim(dia.image_url))
    return "slides: image_url"
  return null
}

function blokkokHiba(blocks: unknown): string | null {
  if (!Array.isArray(blocks) || blocks.length !== BLOKK_KULCSOK.length)
    return "blocks: pontosan nyolc blokk"
  const latott = new Set<string>()
  for (const b of blocks) {
    if (!objektum(b) || !pontosan(b, ["key", "visible"]))
      return "blocks: elem alakja"
    if (typeof b.visible !== "boolean") return "blocks: visible"
    if (
      typeof b.key !== "string" ||
      !(BLOKK_KULCSOK as readonly string[]).includes(b.key)
    )
      return "blocks: ismeretlen kulcs"
    latott.add(b.key)
  }
  return latott.size === BLOKK_KULCSOK.length
    ? null
    : "blocks: egy blokk egyszer"
}

function kozossegiHiba(x: unknown, nev: string): string | null {
  return x === null || (szoveg(x, 500) && KULSO_CIM.test(x))
    ? null
    : `footer.social.${nev}`
}

function lablecHiba(footer: unknown): string | null {
  if (
    !objektum(footer) ||
    !pontosan(footer, ["intro", "columns", "social", "bottom_text"])
  )
    return "footer: alak"
  // A bolt validatoraval azonos (8000, #567): az OS a tisztitott erteket is
  // 4000-re korlatozza, a 8000 tartalek egy regebbi OS-nek; a kulonbseg nem
  // lehet, hogy az elonezet olyat dobjon vissza, amit a bolt elfogadna.
  if (!szoveg(footer.intro, 8000)) return "footer.intro"
  if (!szoveg(footer.bottom_text, 300)) return "footer.bottom_text"
  const { columns, social } = footer
  if (!Array.isArray(columns) || columns.length > 4) return "footer.columns"
  for (const oszlop of columns) {
    if (!objektum(oszlop) || !pontosan(oszlop, ["title", "links"]))
      return "footer.columns: oszlop alakja"
    // az oszlop cime lehet ures (az OS szabalya is: csak a hossz korlatos)
    if (!szoveg(oszlop.title, 100)) return "footer.columns: title"
    if (!Array.isArray(oszlop.links) || oszlop.links.length > 12)
      return "footer.columns: links"
    for (const link of oszlop.links) {
      if (!objektum(link) || !pontosan(link, ["label", "href"]))
        return "footer.columns: link alakja"
      if (!szoveg(link.label, 100, 1)) return "footer.columns: label"
      if (!linkCim(link.href)) return "footer.columns: href"
    }
  }
  if (
    !objektum(social) ||
    !pontosan(social, ["facebook", "instagram", "youtube"])
  )
    return "footer.social: alak"
  for (const nev of ["facebook", "instagram", "youtube"]) {
    const hiba = kozossegiHiba(social[nev], nev)
    if (hiba) return hiba
  }
  return null
}

/** A teljes rekord ellenorzese; az OS ezt kuldi az elonezetnek (`content`). */
export function ervenyesRekord(x: unknown): RekordEredmeny {
  const nem = (hiba: string): RekordEredmeny => ({ ok: false, hiba })
  if (!objektum(x)) return nem("a rekord nem objektum")
  const megengedett = [
    "texts",
    "slides",
    "featured_handles",
    "featured_brand_handles",
    "blocks",
    "footer",
  ]
  for (const k of Object.keys(x))
    if (!megengedett.includes(k)) return nem(`ismeretlen kulcs: ${k}`)

  const {
    texts,
    slides,
    featured_handles: handles,
    featured_brand_handles: markaHandles,
    blocks,
    footer,
  } = x
  if (!objektum(texts)) return nem("texts: objektum kell")
  const kulcsok = Object.keys(texts)
  if (kulcsok.length > 400) return nem("texts: legfeljebb 400")
  for (const k of kulcsok) {
    if (!SZOVEG_KULCS.test(k)) return nem(`texts: rossz kulcs (${k})`)
    if (!szoveg(texts[k], 2000)) return nem(`texts: ${k}`)
  }

  if (!("slides" in x)) return nem("slides: kotelezo")
  if (slides !== null) {
    if (!Array.isArray(slides) || slides.length > 5)
      return nem("slides: legfeljebb 5")
    for (const dia of slides) {
      const hiba = diaHiba(dia)
      if (hiba) return nem(hiba)
    }
  }

  if (handles !== undefined && handles !== null) {
    if (!Array.isArray(handles) || handles.length > 12)
      return nem("featured_handles: legfeljebb 12")
    for (const h of handles)
      if (
        typeof h !== "string" ||
        h.length < 1 ||
        h.length > 200 ||
        !HANDLE.test(h) ||
        h.includes("..")
      )
        return nem("featured_handles: handle")
    if (new Set(handles).size !== handles.length)
      return nem("featured_handles: egyszer")
  }

  if (markaHandles !== undefined && markaHandles !== null) {
    if (!Array.isArray(markaHandles) || markaHandles.length > 500)
      return nem("featured_brand_handles: legfeljebb 500")
    for (const h of markaHandles)
      if (
        typeof h !== "string" ||
        h.length < 1 ||
        h.length > 200 ||
        !HANDLE.test(h) ||
        h.includes("..")
      )
        return nem("featured_brand_handles: handle")
    if (new Set(markaHandles).size !== markaHandles.length)
      return nem("featured_brand_handles: egyszer")
  }

  if (blocks !== undefined && blocks !== null) {
    const hiba = blokkokHiba(blocks)
    if (hiba) return nem(hiba)
  }
  if (footer !== undefined && footer !== null) {
    const hiba = lablecHiba(footer)
    if (hiba) return nem(hiba)
  }
  return { ok: true, rekord: x as unknown as KezdolapTartalom }
}
