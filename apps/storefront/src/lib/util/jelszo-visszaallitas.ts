import type { Locale } from "@lib/i18n/locale"
import type { AuthHibaKod } from "@lib/util/auth-hiba"
import type { SebessegKorlat } from "@lib/util/hirlevel-feliratkozas"
import { jelszoHosszuEleg } from "@lib/util/jelszo"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"

/**
 * AZ ELFELEJTETT JELSZO ES AZ UJ JELSZO MAGJA (kartya 7bfca4eb), keretrendszer nelkul (a szerveroldali akcio hivja, a teszt kozvetlenul).
 *
 * A KERES VALASZA ALTALANOS: "ha van fiok, elkuldtuk". A bolt utja (`/auth/customer/emailpass/reset-password`) minden cimre
 * ugyanazt a 201-et adja, es a kirakat sem mond mast: a valasz nem arulja el, melyik cim regisztralt (enumeracio ellen). A
 * level a bolt dolga (`auth.password_reset`, az OS sablonja); itt csak a kerest visszuk.
 *
 * A TOKEN A LEVEL TITKA: az uj jelszo lapja a cimbol olvassa a bongeszoben, es csak a gomb megnyomasara megy a bolthoz (egy
 * levelszkenner, ami megnyitja a linket, semmit nem valtoztat). A bolt a tokent egyszer fogadja el, 15 percig; ha mar nem jo
 * (lejart, felhasznalt, hamis), a valasz 401, es az egy kod: `reset_link_invalid`.
 */
export const JELSZO_KERES_UT = "/auth/customer/emailpass/reset-password"
export const UJ_JELSZO_UT = "/auth/customer/emailpass/update"

/**
 * A KERES BEALLITASAI A BOLTHOZ (mert a bolt valasza NEM JSON). A Medusa `reset-password` utja `201 Created`-et ad, szoveges torzzsel
 * ("Created"); a js-sdk `fetch`-e viszont alapbol `accept: application/json`-t kuld, es ilyenkor a valaszt JSON-kent olvassa: a szoveges
 * torzs `SyntaxError`, vagyis egy SIKERES kerest hibanak latott (merve a teszt kirakaton 2026-11-24: az oldal "Nem sikerult"-et mondott,
 * mikozben a bolt elfogadta a kerest). A fejlec az `accept`-et felulirja, a valaszt nyersen kapjuk, es csak az allapota szamit.
 */
export const jelszoKeresBeallitas = (torzs: unknown) => ({
  method: "POST" as const,
  body: torzs as Record<string, unknown>,
  headers: { accept: "*/*" },
  cache: "no-store" as const,
})

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** A bolt visszaallito tokenje egy JWT: harom base64url resz. Mas alaku tokent el sem kuldunk. */
export const VISSZAALLITO_TOKEN =
  /^[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,2048}\.[A-Za-z0-9_-]{8,2048}$/

export type JelszoKeresAllapot =
  | { state: "success" }
  | { state: "error"; error: AuthHibaKod; ertekek: { email: string } }

export async function jelszoVisszaallitasKeres(
  urlap: { email: string; ip: string; nyelv?: Locale },
  fuggoseg: {
    korlat: SebessegKorlat
    kuld: (torzs: {
      identifier: string
      metadata: { locale: string }
    }) => Promise<unknown>
  },
): Promise<JelszoKeresAllapot> {
  const email = urlap.email.trim().toLowerCase()
  const ertekek = { email: urlap.email.trim() }
  if (!email || email.length > 254 || !EMAIL.test(email))
    return { state: "error", error: "email_invalid", ertekek }
  // latogatonkent (IP) ot kerest tiz percenkent, ebben a kirakat-folyamatban; a bolt cimenkent is korlatoz (harom 15 percenkent)
  if (!fuggoseg.korlat.allow(urlap.ip))
    return { state: "error", error: "too_many_attempts", ertekek }
  try {
    await fuggoseg.kuld({
      identifier: email,
      metadata: { locale: urlap.nyelv ?? "hu" },
    })
    return { state: "success" }
  } catch (e) {
    const kod = hibaAllapota(e)
    if (kod === 429)
      return { state: "error", error: "too_many_attempts", ertekek }
    console.warn("[jelszo] a visszaallitas keresen hiba:", kod ?? "hiba")
    return { state: "error", error: "generic", ertekek }
  }
}

export type UjJelszoAllapot =
  | { state: "success" }
  // nincs `ertekek`: minden mezo jelszo vagy token, egyik sem megy vissza
  | { state: "error"; error: AuthHibaKod }

export async function ujJelszoBeallit(
  urlap: { token: string; jelszo: string; jelszoUjra: string },
  fuggoseg: {
    kuld: (kerés: { token: string; password: string }) => Promise<unknown>
  },
): Promise<UjJelszoAllapot> {
  if (!urlap.jelszo || !urlap.jelszoUjra)
    return { state: "error", error: "reset_fields_required" }
  if (urlap.jelszo !== urlap.jelszoUjra)
    return { state: "error", error: "passwords_differ" }
  if (!jelszoHosszuEleg(urlap.jelszo))
    return { state: "error", error: "password_short" }
  if (!VISSZAALLITO_TOKEN.test(urlap.token))
    return { state: "error", error: "reset_link_invalid" }
  try {
    await fuggoseg.kuld({ token: urlap.token, password: urlap.jelszo })
    return { state: "success" }
  } catch (e) {
    const kod = hibaAllapota(e)
    // a bolt a lejart, a felhasznalt es a hamis tokent egyformán 401-gyel utasitja el
    if (kod === 401 || kod === 403)
      return { state: "error", error: "reset_link_invalid" }
    if (kod === 429) return { state: "error", error: "too_many_attempts" }
    // a bolt rovid jelszora 400-at ad (a kirakat ellenorzese ezt elore megfogja)
    if (kod === 400) return { state: "error", error: "password_short" }
    console.warn("[jelszo] az uj jelszo mentesen hiba:", kod ?? "hiba")
    return { state: "error", error: "generic" }
  }
}
