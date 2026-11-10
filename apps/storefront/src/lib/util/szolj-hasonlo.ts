import { translator, type Key } from "@lib/i18n/dictionary"
import { DEFAULT_LOCALE, type Locale } from "@lib/i18n/locale"
import { fajKulcs } from "@lib/util/eladott-darab"
import type { SebessegKorlat } from "@lib/util/hirlevel-feliratkozas"
import type { HirlevelLinkFajta } from "@lib/util/hirlevel-link"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"

/**
 * "SZÓLJ, HA JÖN HASONLÓ" (V2.4, kartya 0c1265d2; korall szovegei:
 * exchange/otletek-2026-11-04/v-feluleti-szovegek.md, V2.4). Az eladott egyedi
 * darab lapjan egy e-mail-cim feliratkozik a darab FAJARA; a bolt a hirlevel
 * kettos megerositesevel kezeli (`/store/stock-alerts`, commerce #701).
 *
 * A HOZZAJARULAS ES A LEVEL SZOVEGE NEM VEGLEGES (jogi ellenorzes), ezert az
 * urlap kapcsolo mogott all: `NEXT_PUBLIC_STOCK_ALERT=on`, parban a bolt
 * `ACROPORA_STOCK_ALERT` kapcsolojaval, csak a teszt kirakaton.
 */
export const szoljBekapcsolva = (): boolean =>
  process.env.NEXT_PUBLIC_STOCK_ALERT?.trim() === "on"

/** A fajt NEM nevezo jelzok ("Acropora sp.", "cf. tenuis"): a bolt ezekre 400-at ad, tehat urlap sem all. */
const NEM_FAJ = new Set(["sp", "spp", "cf", "aff", "var", "x"])

/**
 * A faj, amire fel lehet iratkozni: a cim latin binomialisa (`fajKulcs`), ha a
 * jelzo tenyleg fajt nevez. A bolt ugyanezt a szabalyt futtatja a termek SAJAT
 * cimen (`speciesOfTitle`), az urlap csak akkor all, ha ott is lesz faj.
 */
export function szoljFaj(cim: string | null | undefined): string | null {
  const faj = fajKulcs(cim)
  return faj && !NEM_FAJ.has(faj.split(" ")[1]!) ? faj : null
}

/**
 * Kell-e urlap a lapra: csak a NEM ELERHETO egyedi darabnal (`ELADVA`), csak ha a
 * cim fajt nevez, es csak a kapcsolo mogott. A termeklap sablonja ezt hivja.
 */
export const szoljUrlapKell = (
  lapAllapot: string,
  cim: string | null | undefined,
): boolean => lapAllapot === "ELADVA" && szoljBekapcsolva() && !!szoljFaj(cim)

/**
 * MIRE VARUNK: a FAJRA (`species`, "Szólj, ha jön hasonló": a bolt a termek cimebol olvassa a fajt) vagy pontosan erre a
 * TERMEKRE (`product`, "Értesíts, ha megérkezik", V2.6 S3b: egy uton levo allat, aminek van erkezese). A bolt
 * mindkettot ismeri (`kind`); a hozzajarulas mondata kulon (a bolt `STOCK_ALERT_CONSENT` mondata fajtankent).
 */
export type SzoljFajta = "species" | "product"

/** Ismeretlen vagy hianyzo fajta: a FAJ (a regi alak): ujat az urlap sosem kuld, de a szerveroldali akcio nem hisz neki. */
export const szoljFajtaOf = (ertek: unknown): SzoljFajta =>
  ertek === "product" ? "product" : "species"

/**
 * Kell-e az "Értesíts, ha megérkezik" urlap: van erkezes, a termek most nem kaphato (az `arrivalShown` szabalya), es a
 * kapcsolo be van kapcsolva (a hozzajarulas es a level szovege nem vegleges). A faj-urlap ilyenkor nem all mellette: a
 * konkretabb kerdes elsobbseget kap.
 */
export const erkezesUrlapKell = (erkezesLatszik: boolean): boolean =>
  erkezesLatszik && szoljBekapcsolva()

export type SzoljAllapot =
  | { allapot: "kesz" }
  | { allapot: "hiba"; uzenet: string; ertekek: { email: string } }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * A FELIRATKOZAS MAGJA, keretrendszer nelkul (a szerveroldali akcio hivja, a
 * teszt kozvetlenul). A latogatonkenti korlat itt szamol, a hirlevel okabol
 * (`hirlevel-feliratkozas.ts`): a bolt minden kerest a kirakat szerverenek
 * cimerol lat.
 *
 * A "Már feliratkoztál erre a fajra" mondat NEM all itt, pedig korall szovegeiben
 * szerepel: a bolt minden feliratkozasra ugyanazt valaszolja, kulonben barki
 * kiderithetne, hogy egy cim rajta van-e a listan.
 */
export async function szoljFeliratkozas(
  urlap: {
    email: string
    hozzajarul: boolean
    termekId: string
    /** az "Érkező állatok" lap kotetlen sora (V2.6 S4c): a termek helyett ezt kuldi, es csak a fajra var */
    erkezesId?: string
    ip: string
    nyelv?: Locale
    /** mire varunk; hianyzo: a faj (a V2.4 alak) */
    fajta?: SzoljFajta
  },
  fuggosegek: {
    kuld: (
      torzs: (
        | { product_id: string; kind: SzoljFajta }
        | { arrival_id: string; kind: "species" }
      ) & { email: string; consent: true; locale: Locale },
    ) => Promise<unknown>
    korlat: SebessegKorlat
  },
): Promise<SzoljAllapot> {
  const nyelv = urlap.nyelv ?? DEFAULT_LOCALE
  const t = translator(nyelv)
  const email = urlap.email.trim()
  const hiba = (kulcs: Key): SzoljAllapot => ({
    allapot: "hiba",
    uzenet: t(kulcs),
    ertekek: { email },
  })
  if (!email || email.length > 254 || !EMAIL.test(email))
    return hiba("stockAlert.errorEmail")
  if (!urlap.hozzajarul) return hiba("stockAlert.errorConsent")
  const termekId = urlap.termekId.trim()
  const erkezesId = urlap.erkezesId?.trim() ?? ""
  // pontosan az egyik: a termek lapja a termeket, az erkezo allatok lapja az erkezes sorat kuldi
  if (!termekId === !erkezesId) return hiba("stockAlert.errorFailed")
  if (!fuggosegek.korlat.allow(urlap.ip)) return hiba("stockAlert.errorLimit")
  try {
    await fuggosegek.kuld({
      ...(erkezesId
        ? { arrival_id: erkezesId, kind: "species" as const }
        : { product_id: termekId, kind: urlap.fajta ?? "species" }),
      email,
      consent: true,
      locale: nyelv,
    })
    return { allapot: "kesz" }
  } catch (e) {
    const kod = hibaAllapota(e)
    if (kod === 429) return hiba("stockAlert.errorLimit")
    if (kod === 403) return hiba("stockAlert.errorOff")
    console.warn("[ertesites] a feliratkozas nem ment at:", kod ?? e)
    return hiba("stockAlert.errorFailed")
  }
}

/** A levelben kuldott ket link boltbeli utja (a link lapja kattintasra kuldi a tokent, `hirlevelLink`). */
export const SZOLJ_LINK_UT: Record<HirlevelLinkFajta, string> = {
  megerosites: "/store/stock-alerts/confirm",
  leiratkozas: "/store/stock-alerts/unsubscribe",
}
