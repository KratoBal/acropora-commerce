/**
 * AZ ÁTVÉTEL DOBOZ SORAI A KOSÁR LAPON, A BOLT SAJÁT VÁLASZÁBÓL (task t-20261116-kosar-dobozok; acrobot, 2026-11-16: tájékoztató
 * doboz, nem rádió; a választás a pénztárban marad).
 *
 * A neveket és az árakat NEM ÍRJUK A KIRAKATBA: a `GET /store/shipping-options` válasza adja, mert a szállítási módok a bolt
 * beállításai (a placeholder-section fejléce ugyanezt mondja: egy beírt ár olyat állítana, amit semmi nem igazol). Mérve a teszt
 * Medusán 2026-11-16-án, cím nélküli kosárral: a bolti átvétel FIX 0, a GLS és a Foxpost módok SZÁMOLT áron, aminek cím nélkül
 * nincs összege (`amount` hiányzik). Egy hiányzó összeg ezért NEM nulla és NEM hiba: "az ár a cím megadása után látszik".
 *
 * Egy élő állatos (csak bolti) kosárra a bolt egyetlen opciót ad vissza: ezt a doboz ugyanúgy kirajzolja, nem találja ki a többit.
 */
export interface SzallitasiOpcioBemenet {
  id?: string
  name?: string | null
  price_type?: string | null
  amount?: number | null
}

export type AtvetelAr = { tipus: "fix"; osszeg: number } | { tipus: "cim-utan" }

export interface AtvetelSor {
  azonosito: string
  nev: string
  ar: AtvetelAr
}

/**
 * A SOROK: csak a nevesített opciók, a bolt sorrendjében. FIX ár akkor van, ha az opció `flat` és az összeg szám (a nulla is szám:
 * a bolti átvétel ingyenes); minden más (számolt ár, hiányzó összeg) "a cím után". A név nélküli opciót nem rajzoljuk ki: egy
 * névtelen sor nem mond semmit a vevőnek.
 */
export function atvetelSorok(
  opciok: readonly SzallitasiOpcioBemenet[] | null | undefined,
): AtvetelSor[] {
  if (!opciok) return []
  return opciok.flatMap((opcio, index) => {
    const nev = opcio.name?.trim()
    if (!nev) return []
    const fix = opcio.price_type === "flat" && typeof opcio.amount === "number"
    return [
      {
        azonosito: opcio.id ?? `opcio-${index}`,
        nev,
        ar: fix
          ? { tipus: "fix" as const, osszeg: opcio.amount as number }
          : { tipus: "cim-utan" as const },
      },
    ]
  })
}
