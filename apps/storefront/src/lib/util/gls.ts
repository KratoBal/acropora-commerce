import { translator, type Key, type Translate } from "@lib/i18n/dictionary"

/**
 * A GLS A PENZTARBAN: tiszta szabalyok (Balazs GLS-promptja, 2-9. pont; Figma
 * 508:3, 508:231, 508:426). A kepernyon csak a bekotes marad.
 */

export type GlsTipus = "parcel-shop" | "parcel-locker"
export type GlsTelitettseg = "lowVolume" | "highVolume" | "outOfOrder"

/** Egy GLS pont, ahogy a hatter kereseje adja (`GET /store/gls/pickup-points`). */
export type GlsPont = {
  id: string
  name: string
  zip: string
  city: string
  address: string
  type: GlsTipus
  hours?: { day: number; from: string; to: string }[]
  features?: string[]
  has_wheelchair_access?: boolean
  locker_saturation?: GlsTelitettseg | null
}

/** A hivatalos logok a Figmabol (516:2, 517:2, 522:2), a `public/images` alatt. */
export const GLS_LOGO = {
  altalanos: "/images/gls.png",
  csomagpont: "/images/gls-csomagpont.png",
  automata: "/images/gls-automata.png",
} as const

/** A pont fajtaja a vevo szavaival: ParcelShop vagy automata, soha nem minden "automata". */
export function glsTipusFelirat(tipus: string | null | undefined): string {
  return tipus === "parcel-locker" ? "GLS Automata" : "GLS ParcelShop"
}

/** A fajta logoja: az automatanak a sajatja, a ParcelShopnak a Csomagpont-logo. */
export function glsTipusLogo(tipus: string | null | undefined): string {
  return tipus === "parcel-locker" ? GLS_LOGO.automata : GLS_LOGO.csomagpont
}

/** A hét napjai a GLS számozása szerint (1 = hétfő); a rövidítés a nyelvé. */
const NAP_KULCS: readonly (Key | "")[] = [
  "",
  "checkoutShipping.dayMon",
  "checkoutShipping.dayTue",
  "checkoutShipping.dayWed",
  "checkoutShipping.dayThu",
  "checkoutShipping.dayFri",
  "checkoutShipping.daySat",
  "checkoutShipping.daySun",
]

/** "08:00" -> "8", "17:30" -> "17:30": a Figma rovid alakja ("H–P 7–20"). */
const ora = (ido: string) => {
  const [h, m] = ido.split(":")
  return m === "00" ? String(Number(h)) : `${Number(h)}:${m}`
}

/**
 * A NYITVATARTAS EGY SORBAN: "0–24", ha a het minden napjan egesz nap nyitva;
 * kulonben az egymas utani, azonos ideju napok osszevonva ("H–P 8–17:30, Szo
 * 9–14:30"). Ami nincs a listaban, az zarva van, es nem irjuk ki.
 */
export function glsNyitvatartas(
  hours: GlsPont["hours"] | undefined,
  t: Translate = translator("hu"),
): string | null {
  const sorok = [...(hours ?? [])]
    .filter((sor) => sor.day >= 1 && sor.day <= 7)
    .sort((a, b) => a.day - b.day)
  if (!sorok.length) return null
  const egeszNap = (sor: { from: string; to: string }) =>
    sor.from === "00:00" && sor.to === "24:00"
  if (sorok.length === 7 && sorok.every(egeszNap)) return "0–24"

  const nap = (szam: number) => t(NAP_KULCS[szam] as Key)
  const csoportok: { elso: number; utolso: number; ido: string }[] = []
  for (const sor of sorok) {
    const ido = egeszNap(sor) ? "0–24" : `${ora(sor.from)}–${ora(sor.to)}`
    const elozo = csoportok.at(-1)
    if (elozo && elozo.ido === ido && elozo.utolso === sor.day - 1) {
      elozo.utolso = sor.day
    } else {
      csoportok.push({ elso: sor.day, utolso: sor.day, ido })
    }
  }
  return csoportok
    .map(({ elso, utolso, ido }) =>
      elso === utolso
        ? `${nap(elso)} ${ido}`
        : `${nap(elso)}–${nap(utolso)} ${ido}`,
    )
    .join(", ")
}

/** A pont jellemzoi a vevo szavaival; csak az, amit a GLS adat allit. */
export function glsJellemzok(
  pont: {
    features?: string[]
    has_wheelchair_access?: boolean
  },
  t: Translate = translator("hu"),
): string[] {
  const f = pont.features ?? []
  return [
    ...(f.includes("acceptsCard") ? [t("checkoutShipping.featureCard")] : []),
    ...(f.includes("acceptsCash") ? [t("checkoutShipping.featureCash")] : []),
    ...(pont.has_wheelchair_access
      ? [t("checkoutShipping.featureAccessible")]
      : []),
  ]
}

/** "GLS Automata · 0–24 · bankkártya · akadálymentes" (Figma 508:114). */
export function glsInfoSor(
  pont: Partial<GlsPont>,
  t: Translate = translator("hu"),
): string {
  return [
    glsTipusFelirat(pont.type),
    glsNyitvatartas(pont.hours, t),
    ...glsJellemzok(pont, t),
  ]
    .filter(Boolean)
    .join(" · ")
}

/**
 * A TELITETTSEG (a prompt 6. pontja): `outOfOrder` nem valaszthato, a
 * `highVolume` valaszthato, figyelmeztetessel. Konkret hibat nem talalunk ki:
 * a mondat csak azt mondja, amit a GLS adat allit.
 */
export function glsTelitettsegAllapot(
  telitettseg: GlsTelitettseg | null | undefined,
  t: Translate = translator("hu"),
): { valaszthato: boolean; figyelmeztetes: string | null } {
  if (telitettseg === "outOfOrder")
    return {
      valaszthato: false,
      figyelmeztetes: t("checkoutShipping.glsNotSelectable"),
    }
  if (telitettseg === "highVolume")
    return {
      valaszthato: true,
      figyelmeztetes: t("checkoutShipping.glsHighLoad"),
    }
  return { valaszthato: true, figyelmeztetes: null }
}

/**
 * A HIVATALOS KERESO VALASZTASA (`<gls-dpm>` `change` esemenye, a `detail` a
 * pont; barracuda merese a widget kodjabol). A bongeszobol CSAK AZ AZONOSITO
 * megy tovabb: a hatter a sajat listajabol ellenorzi es irja a tobbit.
 */
export function glsPontWidgetbol(detail: unknown): { id: string } | null {
  if (!detail || typeof detail !== "object") return null
  const id = (detail as Record<string, unknown>).id
  return typeof id === "string" && id.trim() ? { id: id.trim() } : null
}

/** A szállítási sor fajtái; a szöveg a szótárból jön, a FOXPOST név márkanév. */
export type SzallitasiSorFajta =
  "foxpost" | "glsPont" | "glsPontNehez" | "glsHaz" | "glsHazNehez"

const SZALLITASI_SOR_KULCS: Record<
  Exclude<SzallitasiSorFajta, "foxpost">,
  { nev: Key; leiras: Key }
> = {
  glsPont: {
    nev: "checkoutShipping.modeGlsPoint",
    leiras: "checkoutShipping.modeGlsPointText",
  },
  // a nehezaru csak ParcelShopba mehet (a hatter szabalya)
  glsPontNehez: {
    nev: "checkoutShipping.modeGlsPointHeavy",
    leiras: "checkoutShipping.modeGlsPointHeavyText",
  },
  glsHaz: {
    nev: "checkoutShipping.modeGlsHome",
    leiras: "checkoutShipping.modeGlsHomeText",
  },
  glsHazNehez: {
    nev: "checkoutShipping.modeGlsHomeHeavy",
    leiras: "checkoutShipping.modeGlsHomeHeavyText",
  },
}

/** A szallitasi sorok szovegei (a prompt 2. pontja) a lap nyelvén. */
export function szallitasiSor(
  fajta: SzallitasiSorFajta,
  t: Translate = translator("hu"),
): { nev: string; leiras: string } {
  if (fajta === "foxpost")
    return { nev: "FOXPOST", leiras: t("checkoutShipping.modeFoxpostText") }
  const kulcs = SZALLITASI_SOR_KULCS[fajta]
  return { nev: t(kulcs.nev), leiras: t(kulcs.leiras) }
}
