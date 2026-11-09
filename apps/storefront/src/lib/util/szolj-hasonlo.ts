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
    ip: string
    nyelv?: Locale
  },
  fuggosegek: {
    kuld: (torzs: {
      product_id: string
      kind: "species"
      email: string
      consent: true
      locale: Locale
    }) => Promise<unknown>
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
  if (!termekId) return hiba("stockAlert.errorFailed")
  if (!fuggosegek.korlat.allow(urlap.ip)) return hiba("stockAlert.errorLimit")
  try {
    await fuggosegek.kuld({
      product_id: termekId,
      kind: "species",
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
