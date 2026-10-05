/**
 * A FOXPOST-CSOMAGPONT (P4-1), ahogy a backend kereseje adja
 * (`GET /store/foxpost/pickup-points?q=`). A penztar csak az azonositot kuldi
 * vissza; a nevet es a cimet a backend a sajat listajabol teszi a szallitasi
 * modra, tehat a bongeszo nem irhat be kitalalt pontot.
 */
export type FoxpostCsomagpont = {
  id: string
  name: string
  address: string
  zip: string
  city: string
  /** A pont tipusa a Foxpost szavaival ("FOXPOST A-BOX", "FOXPOST Z-BOX", "Packeta Z-Pont"). */
  variant?: string
  /** Foxpost kodjai: "card", "cash", "link", "app". */
  payment_options?: string[]
  /** Foxpost kodjai: "pick up", "dispatch". */
  services?: string[]
  /** A tipus hivatalos ikonja (cdn.foxpost.hu, a hatter szuri). */
  icon_url?: string | null
  /** A Foxpost "find me" jegyzete, sima szovegkent. */
  findme?: string
  /**
   * A GLS-pont sajat, helyi logoja a fajtajahoz (ParcelShop vagy automata;
   * `public/images`), nem kulso cim.
   */
  tipus_logo?: string
  /** A GLS-pont nem valaszthato most (`outOfOrder`): a sor latszik, de tiltott. */
  nem_valaszthato?: boolean
  /** Egy rovid figyelmezteto sor (a GLS `highVolume`-ja, vagy hogy miert tiltott). */
  figyelmeztetes?: string | null
  /** A szolgaltato sajat reszlet-sora; ha van, a Foxpost-fele helyett ez latszik. */
  reszletek?: string
}

const FIZETESI_LEHETOSEG: Record<string, string> = {
  card: "bankkártya",
  cash: "készpénz",
  link: "fizetési link",
  app: "FOXPOST alkalmazás",
}

/**
 * A PONT SZOLGALTATASA ES FIZETESE EGY SORBAN, a Foxpost sajat kodjaibol
 * (a hivatalos kereso szurofeltetelei: "Csomagfeladás és -átvétel", "Csak
 * csomagátvétel"; fizetes bankkartyaval, keszpenzzel, linken, appon at).
 * Csak az kerul bele, amit a pont tenylegesen tud; ismeretlen kod kimarad.
 */
export function foxpostPontReszletek(pont: {
  services?: string[]
  payment_options?: string[]
}): string {
  const szolg = pont.services ?? []
  const reszek: string[] = []
  if (szolg.includes("pick up")) {
    reszek.push(
      szolg.includes("dispatch")
        ? "Csomagfeladás és -átvétel"
        : "Csak csomagátvétel",
    )
  }
  const fizetes = (pont.payment_options ?? [])
    .map((kod) => FIZETESI_LEHETOSEG[kod])
    .filter(Boolean)
  if (fizetes.length) reszek.push(`Fizetés: ${fizetes.join(", ")}`)
  return reszek.join(" · ")
}

/**
 * A HIVATALOS KERESO UZENETE (mérve 2026-10-05, a kereso sajat kodjabol:
 * `cdn.foxpost.hu/apt-finder/v1/app/assets/js/app.min.js`). A "Kiválasztom"
 * gomb a pontot `window.top.postMessage(JSON.stringify(pont), "*")` alakban
 * kuldi; a pont mezoi azonosak a foxplus.json-eval (operator_id, name,
 * address, variant, ...).
 *
 * A BONGESZOBOL CSAK AZ AZONOSITO MEGY TOVABB. A hatter a sajat listajabol
 * ellenorzi es irja a nevet, a cimet es a tipust, mint eddig: egy hamis uzenet
 * legfeljebb egy nem letezo azonositot kuldhet, amit a hatter elutasit.
 */
export function foxpostPontUzenetbol(adat: unknown): FoxpostCsomagpont | null {
  let pont: unknown = adat
  if (typeof adat === "string") {
    try {
      pont = JSON.parse(adat)
    } catch {
      return null
    }
  }
  if (!pont || typeof pont !== "object") return null
  const p = pont as Record<string, unknown>
  const id = typeof p.operator_id === "string" ? p.operator_id.trim() : ""
  if (!id) return null
  const szoveg = (ertek: unknown) =>
    typeof ertek === "string" ? ertek.trim() : ""
  const lista = (ertek: unknown) =>
    Array.isArray(ertek)
      ? ertek.filter((x): x is string => typeof x === "string")
      : []
  return {
    id,
    name: szoveg(p.name),
    address: szoveg(p.address),
    zip: szoveg(p.zip),
    city: szoveg(p.city),
    variant: szoveg(p.variant),
    payment_options: lista(p.paymentOptions),
    services: lista(p.service),
  }
}

export type CsomagpontKereses = {
  /** `false`, ha a Foxpost nincs beallitva vagy a listaja nem erheto el. */
  elerheto: boolean
  pontok: FoxpostCsomagpont[]
  /** Az osszes talalat szama; a `pontok` ennek legfeljebb az elso `limit` darabja. */
  talalat: number
}

/** A szallitasi mod adata a kivalasztott csomagponttal (`setShippingMethod`). */
export function foxpostSzallitasiAdat(pontId: string) {
  return { foxpost_pickup_point: { id: pontId } }
}

/**
 * A GLS-csomagpont szallitasi adata (P4): csak az azonosito megy, es hogy
 * melyik valasztobol jott (`finder`: a hivatalos kereso, `fallback`: a
 * tartalek lista); a tobbit a hatter irja a sajat listajabol.
 */
export function glsSzallitasiAdat(
  pontId: string,
  forras: "finder" | "fallback" = "fallback",
) {
  return { gls_pickup_point: { id: pontId, source: forras } }
}

/** Egy GLS csomagpontos szallitasi mod, es hogy nehezarus-e (csak csomagbolt). */
export type GlsPontMod = { option_id: string; heavy: boolean }
