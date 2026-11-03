/**
 * A SZAMLAZASI ADATOK (P5, 257:102): a magyar adoszam ellenorzese es az urlap
 * szabalyai. Tiszta fuggvenyek; a mentes a `lib/data/customer.ts`-ben van.
 *
 * AZ ADOSZAM HELYE (acrobot dontese, 2026-09-29): a szamlazasi cim
 * `metadata.tax_id` kulcsa, egyetlen, dokumentalt kulcs, hogy a P4 szamlazas
 * ugyanezt olvassa. Magyar alak: 8-1-2 szamjegy ("12345678-1-23"), mindig
 * kotojelesen tarolva. Maganszemelynel `null`.
 */
import type { AuthHibaKod } from "./auth-hiba"

export const ADOSZAM_METADATA_KULCS = "tax_id"

export type SzamlazasiTipus = "maganszemely" | "ceg"

/**
 * A TORZSSZAM (az elso nyolc szamjegy) ELLENORZO SZAMJEGYE: az elso het
 * szamjegy 9, 7, 3, 1, 9, 7, 3 sulyu osszege; a nyolcadik szamjegy
 * (10 - osszeg mod 10) mod 10. Ket nyilvanos cegadoszamon visszamerve
 * (2026-09-29); a tesztekben generalt szamok allnak, valodi nem.
 */
export function torzsszamRendben(torzsszam: string): boolean {
  if (!/^\d{8}$/.test(torzsszam)) return false
  const sulyok = [9, 7, 3, 1, 9, 7, 3]
  const osszeg = sulyok.reduce(
    (s, suly, i) => s + suly * Number(torzsszam[i]),
    0,
  )
  return (10 - (osszeg % 10)) % 10 === Number(torzsszam[7])
}

/**
 * A magyar adoszam egysegesitve ("12345678-1-23"), vagy `null`, ha nem az.
 * Szokozt es kotojelet elfogad; 11 szamjegy kell, az afakod 1 es 5 kozott,
 * es a torzsszam ellenorzo szamjegye stimmel. A "HU" elotag (kozossegi
 * adoszam) nem ez: azt nem fogadjuk el ide.
 */
export function adoszamEgysegesitve(nyers: string): string | null {
  const szamok = nyers.replace(/[\s-]/g, "")
  if (!/^\d{11}$/.test(szamok)) return null
  const torzsszam = szamok.slice(0, 8)
  const afakod = szamok[8]
  if (!/[1-5]/.test(afakod) || !torzsszamRendben(torzsszam)) return null
  return `${torzsszam}-${afakod}-${szamok.slice(9)}`
}

export type SzamlazasiUrlap = {
  tipus: SzamlazasiTipus
  ceg: string
  adoszam: string
  iranyitoszam: string
  varos: string
  utca: string
}

/** Az urlap hibajanak KODJA (a komponens a lap nyelven fordítja), vagy `null`, ha menthető. */
export function szamlazasiHiba(urlap: SzamlazasiUrlap): AuthHibaKod | null {
  if (!urlap.iranyitoszam || !urlap.varos || !urlap.utca) {
    return "billing_address_required"
  }
  if (!/^\d{4}$/.test(urlap.iranyitoszam)) {
    return "postcode_four_digits"
  }
  if (urlap.tipus === "ceg") {
    if (!urlap.ceg) return "company_required"
    const szamok = urlap.adoszam.replace(/[\s-]/g, "")
    if (!/^\d{8}[1-5]\d{2}$/.test(szamok)) {
      return "tax_id_format"
    }
    if (!adoszamEgysegesitve(urlap.adoszam)) {
      return "tax_id_invalid"
    }
  }
  return null
}
