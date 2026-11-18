/**
 * A CEGES VASARLAS A PENZTARBAN (kartya c977aed2; Balazs, 2026-11-18 21:30 UTC: az adoszam-ellenorzes a penztarban KELL).
 *
 * A penztar eddig csak egy "Cegnev" szoveget gyujtott, adoszamot nem, es a `setAddresses` nem irt metadata-t: a cegkent
 * vasarlo vendeg adoszam nelkul erkezett az OS-be, ahol a szamla-kapu megallitotta, es a kezelo kezzel potolta. Az OS a rendeles
 * szamlazasi (ennek hianyaban szallitasi) cimenek `metadata.tax_id` kulcsat olvassa (`taxNumberOf`), egysegesitve
 * ("12345678-1-23"): ezt a kulcsot irja a fiok szamlazasi urlapja is (`szamlazas.ts`, acrobot dontese 2026-09-29), es ez az ut
 * ugyanazt a formatum- es ellenorzoszamjegy-szabalyt hasznalja (`adoszamEgysegesitve`), nem masodikat.
 *
 * MAGYAR ADOSZAM CSAK (a "HU" elotagu kozossegi adoszam nem fogadhato el itt, mint a fiokban sem). A NAV-nal valo letezes
 * ellenorzese az OS dolga a rendelesen, a szamla kiallitasa elott (P2); a penztarbol valos ideju NAV-hivas nincs (uj titok es kulso
 * OS-vegpont kellene hozza, acrobot 23:11).
 */
import { adoszamEgysegesitve } from "./szamlazas"

/** Az urlap mezoinek nevei: a komponensek es a szerver-muvelet ugyanezt hasznalja. */
export const CEGES_MEZO = "company_purchase"
export const ADOSZAM_MEZO = "tax_id"

/** Egy mezo erteke a FormData-bol, szovegkent (a hianyzo mezo ures szoveg). */
const szoveg = (adat: FormData, nev: string): string => {
  const ertek = adat.get(nev)
  return typeof ertek === "string" ? ertek.trim() : ""
}

export type CegesAdatok =
  | { ok: true; ceges: false; adoszam: null }
  | { ok: true; ceges: true; adoszam: string }
  | { ok: false; uzenet: string }

/**
 * A ceges vasarlas adatai az urlapbol. Ceges, ha a `company_purchase` pipa be van jelolve ("on"). Ilyenkor kell:
 *   - cegnev: a SZAMLAZASI cime (ha a szamlazasi cim kulon van, az o cegneve; kulonben a szallitasie),
 *   - magyar adoszam, ervenyes formaval es ellenorzo szamjegyel.
 * A hiba magyar mondat (a bongeszo a mezon nyelvfuggo `title`-t mutat, ez a szerver vedelme, ha a bongeszo-oldali ellenorzes
 * kimaradna). Nem ceges vasarlasnal az adoszam NEM kerul at, akkor sem, ha a mezo kitoltve maradt a pipa kivetele elott.
 */
export function cegesAdatok(adat: FormData): CegesAdatok {
  if (adat.get(CEGES_MEZO) !== "on")
    return { ok: true, ceges: false, adoszam: null }
  const kulonSzamlazasi = adat.get("same_as_billing") !== "on"
  const cegnev = szoveg(
    adat,
    kulonSzamlazasi ? "billing_address.company" : "shipping_address.company",
  )
  if (!cegnev)
    return {
      ok: false,
      uzenet:
        "Céges vásárlásnál add meg a cég nevét (a számlázási cím cégnevét).",
    }
  const nyers = szoveg(adat, ADOSZAM_MEZO)
  if (!/^\d{8}[\s-]*[1-5][\s-]*\d{2}$/.test(nyers.replace(/\s+/g, " ").trim()))
    return {
      ok: false,
      uzenet:
        "Az adószám alakja nem jó: 11 számjegy kell, például 12345678-1-23.",
    }
  const adoszam = adoszamEgysegesitve(nyers)
  if (!adoszam)
    return {
      ok: false,
      uzenet:
        "Az adószám nem érvényes (az ellenőrző számjegye nem stimmel). Nézd meg újra.",
    }
  return { ok: true, ceges: true, adoszam }
}

/**
 * A cim metadata-ja a kosarra: a ceges adoszam `tax_id`-kent, egyebkent `tax_id: null`, hogy egy korabbi (ceges) kitoltes ne
 * maradjon a cimen, ha a vevo kozben maganszemelyre valtott.
 */
export const cimMetadata = (
  adoszam: string | null,
): { tax_id: string | null } => ({
  tax_id: adoszam,
})
