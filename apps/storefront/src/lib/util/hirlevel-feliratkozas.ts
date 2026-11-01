import { translator } from "@lib/i18n/dictionary"
import { DEFAULT_LOCALE, type Locale } from "@lib/i18n/locale"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"

/**
 * A HIRLEVEL-FELIRATKOZAS MAGJA, keretrendszer nelkul (a szerveroldali akcio
 * hivja, a teszt kozvetlenul).
 *
 * MIERT A KIRAKAT SZAMOLJA A LATOGATONKENTI KORLATOT (barracuda, #577 review):
 * az urlap szerveroldali akcioval megy a bolthoz, mert a teszt bolt CORS-a a
 * kirakat cimet nem engedi a bongeszobol (merve 2026-10-27: a valaszban nincs
 * `access-control-allow-origin`). Igy a bolt minden feliratkozast a kirakat
 * szerverenek cimerol lat, es egy IP-alapu korlat ott az EGESZ boltra szolna.
 * A latogato cimet ezert itt nezzuk (a Traefik `x-real-ip` fejlece), a bolt
 * pedig cimenkent (e-mail) es osszesen korlatoz.
 */
export type HirlevelAllapot =
  | { allapot: "kesz" }
  | { allapot: "hiba"; uzenet: string; ertekek: { nev: string; email: string } }

export type SebessegKorlat = { allow(kulcs: string, most?: number): boolean }

/** Csuszo ablak, memoriaban (a bolt `rate-limit.ts`-evel azonos szabaly). */
export function sebessegKorlat(opts: {
  max: number
  ablakMs: number
  takaritasFelett?: number
}): SebessegKorlat {
  const talalatok = new Map<string, number[]>()
  const takaritas = opts.takaritasFelett ?? 10_000
  return {
    allow(kulcs, most = Date.now()) {
      const ota = most - opts.ablakMs
      if (talalatok.size > takaritas)
        talalatok.forEach((lista, k) => {
          if (lista[lista.length - 1]! <= ota) talalatok.delete(k)
        })
      const friss = (talalatok.get(kulcs) ?? []).filter((t) => t > ota)
      if (friss.length >= opts.max) {
        talalatok.set(kulcs, friss)
        return false
      }
      friss.push(most)
      talalatok.set(kulcs, friss)
      return true
    },
  }
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export const HIRLEVEL_UZENET = {
  hianyzik: "Add meg a neved és az e-mail-címed.",
  email: "Az e-mail-cím formája nem jó.",
  hozzajarulas: "A feliratkozáshoz el kell fogadnod az adatkezelést.",
  korlat: "Túl sok feliratkozás érkezett innen. Próbáld újra pár perc múlva.",
  kikapcsolva: "A hírlevél-feliratkozás most nem elérhető.",
  hiba: "A feliratkozás most nem sikerült. Próbáld újra később.",
} as const

/** A hibauzenetek egy nyelven; a magyar a `HIRLEVEL_UZENET` (a szotar azonos szovegu, a `dictionary.spec.ts` merni). */
export const hirlevelUzenet = (
  nyelv: Locale,
): Record<keyof typeof HIRLEVEL_UZENET, string> => {
  const t = translator(nyelv)
  return {
    hianyzik: t("newsletter.errorMissing"),
    email: t("newsletter.errorEmail"),
    hozzajarulas: t("newsletter.errorConsent"),
    korlat: t("newsletter.errorLimit"),
    kikapcsolva: t("newsletter.errorOff"),
    hiba: t("newsletter.errorFailed"),
  }
}

export async function hirlevelFeliratkozas(
  urlap: {
    nev: string
    email: string
    hozzajarul: boolean
    ip: string
    /** Az urlap nyelve (rejtett mezo); hianyaban magyar. */
    nyelv?: Locale
  },
  fuggosegek: {
    kuld: (torzs: {
      name: string
      email: string
      consent: true
    }) => Promise<unknown>
    korlat: SebessegKorlat
  },
): Promise<HirlevelAllapot> {
  const uz = hirlevelUzenet(urlap.nyelv ?? DEFAULT_LOCALE)
  const nev = urlap.nev.trim()
  const email = urlap.email.trim()
  const hiba = (uzenet: string): HirlevelAllapot => ({
    allapot: "hiba",
    uzenet,
    ertekek: { nev, email },
  })
  if (!nev || !email) return hiba(uz.hianyzik)
  if (nev.length > 100 || email.length > 254 || !EMAIL.test(email))
    return hiba(uz.email)
  if (!urlap.hozzajarul) return hiba(uz.hozzajarulas)
  if (!fuggosegek.korlat.allow(urlap.ip)) return hiba(uz.korlat)
  try {
    await fuggosegek.kuld({ name: nev, email, consent: true })
    return { allapot: "kesz" }
  } catch (e) {
    const kod = hibaAllapota(e)
    if (kod === 429) return hiba(uz.korlat)
    if (kod === 403) return hiba(uz.kikapcsolva)
    if (kod === 400) return hiba(uz.email)
    console.warn("[hirlevel] a feliratkozas nem ment at:", kod ?? e)
    return hiba(uz.hiba)
  }
}
