/**
 * A kosar-valtozas jelzese a szerver-akciok utan (kosarba, modositas, torles).
 * KULON MODUL, szerver-import nelkul: a hivohelyek (kosarba-gomb, termeklap,
 * kosar-sor) ne huzzak be a kosar-allapot szerver-akciojat.
 */
export const KOSAR_VALTOZOTT = "acropora:kosar-valtozott"

export function kosarValtozott(): void {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(KOSAR_VALTOZOTT))
}
