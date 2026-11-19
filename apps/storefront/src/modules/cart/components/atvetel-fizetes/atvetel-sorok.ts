/**
 * AZ ÁTVÉTEL DOBOZ SORAI A KOSÁR LAPON, A BOLT SAJÁT VÁLASZÁBÓL (task t-20261116-kosar-dobozok; acrobot, 2026-11-16: tájékoztató
 * doboz, nem rádió; a választás a pénztárban marad).
 *
 * AZ ÁRAKAT NEM ÍRJUK A KIRAKATBA, és a nevet is a bolt válasza adja, KIVÉVE a pénztár által ismert módokat (Foxpost, GLS pont és ház:
 * `szallitasiFajta`): azoknak a neve a szótárból jön a lap nyelvén, ugyanúgy, mint a pénztár szállítás lépésében (a kirakat angol nézete,
 * 2026-11-19: a kosár dobozban a bolt magyar neve állt az angol oldalon). Az ismeretlen opció neve marad, ahogy a bolt adja.
 * A `GET /store/shipping-options` válasza adja, mert a szállítási módok a bolt
 * beállításai (a placeholder-section fejléce ugyanezt mondja: egy beírt ár olyat állítana, amit semmi nem igazol). Mérve a teszt
 * Medusán 2026-11-16-án, cím nélküli kosárral: a bolti átvétel FIX 0, a GLS és a Foxpost módok SZÁMOLT áron, aminek cím nélkül
 * nincs összege (`amount` hiányzik). Egy hiányzó összeg ezért NEM nulla és NEM hiba: "az ár a cím megadása után látszik".
 *
 * Egy élő állatos (csak bolti) kosárra a bolt egyetlen opciót ad vissza: ezt a doboz ugyanúgy kirajzolja, nem találja ki a többit.
 */
import type { SzallitasiSorFajta } from "@lib/util/gls"

export interface SzallitasiOpcioBemenet {
  id?: string
  name?: string | null
  price_type?: string | null
  amount?: number | null
  /** a bolt valasza megmondja, melyik opcio a bolti atvetel: a teljesitesi halmaz tipusa (`pickup`), a penztar is ebbol dont */
  service_zone?: { fulfillment_set?: { type?: string | null } | null } | null
}

export type AtvetelAr = { tipus: "fix"; osszeg: number } | { tipus: "cim-utan" }

/**
 * A BOLT SZALLITASI MODJAI, AMIT A PENZTAR IS HASZNAL (`/store/foxpost`, `/store/gls`): az opcio azonositoja szerint tudjuk, melyik a Foxpost, melyik
 * a GLS csomagpont vagy haz (es melyik nehezaru). A kosar doboza ebbol veszi a mod nevet a SZOTARBOL, ahogy a penztar szallitas lepese, nem a
 * bolt beallitasaibol jovo magyar nevet (a kirakat angol nezete, 2026-11-19).
 */
export interface SzallitasiOsztaly {
  foxpostOptionId: string | null
  glsPont: readonly { option_id: string; heavy: boolean }[]
  glsHaz: readonly { option_id: string; heavy: boolean }[]
}

/** Az opcio fajtaja a penztar osztalyozasa szerint; `null`: ismeretlen opcio (a bolt neve marad). */
export function szallitasiFajta(
  azonosito: string | undefined,
  osztaly: SzallitasiOsztaly | null | undefined,
): SzallitasiSorFajta | null {
  if (!azonosito || !osztaly) return null
  if (osztaly.foxpostOptionId && azonosito === osztaly.foxpostOptionId)
    return "foxpost"
  const pont = osztaly.glsPont.find((o) => o.option_id === azonosito)
  if (pont) return pont.heavy ? "glsPontNehez" : "glsPont"
  const haz = osztaly.glsHaz.find((o) => o.option_id === azonosito)
  if (haz) return haz.heavy ? "glsHazNehez" : "glsHaz"
  return null
}

export interface AtvetelSor {
  azonosito: string
  nev: string
  /** a penztar osztalyozasa szerinti fajta: a doboz a nevet a szotarbol veszi; `null`: a bolt neve marad */
  fajta: SzallitasiSorFajta | null
  /** a bolti atvetel: a penztar is a sajat (szotar-) felirataval mutatja, nem a bolt opcio-nevevel (task t-20261116-kosar-atvetel-nev) */
  bolti: boolean
  ar: AtvetelAr
}

/**
 * A SOROK: csak a nevesített opciók, a bolt sorrendjében. FIX ár akkor van, ha az opció `flat` és az összeg szám (a nulla is szám:
 * a bolti átvétel ingyenes); minden más (számolt ár, hiányzó összeg) "a cím után". A név nélküli opciót nem rajzoljuk ki: egy
 * névtelen sor nem mond semmit a vevőnek.
 */
export function atvetelSorok(
  opciok: readonly SzallitasiOpcioBemenet[] | null | undefined,
  osztaly?: SzallitasiOsztaly | null,
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
        fajta: szallitasiFajta(opcio.id, osztaly),
        bolti: opcio.service_zone?.fulfillment_set?.type === "pickup",
        ar: fix
          ? { tipus: "fix" as const, osszeg: opcio.amount as number }
          : { tipus: "cim-utan" as const },
      },
    ]
  })
}
