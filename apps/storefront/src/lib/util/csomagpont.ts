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
  // a Foxpost-prompt 6. pontja: a Packeta alkalmazasa (a FOXPOST a Packeta Group resze)
  app: "Packeta app",
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

/**
 * A szallitasi mod adata a kivalasztott csomagponttal (`setShippingMethod`):
 * csak az azonosito, es hogy melyik valasztobol jott (`finder`: a hivatalos
 * kereso, `fallback`: a tartalek lista), mint a GLS-nel. A tobbit a hatter
 * irja a sajat listajabol.
 */
export function foxpostSzallitasiAdat(
  pontId: string,
  forras: "finder" | "fallback" = "fallback",
) {
  return { foxpost_pickup_point: { id: pontId, source: forras } }
}

/**
 * A PONT TIPUSA A VEVO SZAVAIVAL (a Foxpost-prompt 5. pontja): ne jelenjen meg
 * egy Z-BOX vagy egy Z-Pont FOXPOST automatakent. A Foxpost sajat cimkei
 * (merve 2026-10-05, a foxplus.json `variant` mezoje): "FOXPOST A-BOX",
 * "FOXPOST Z-BOX", "Packeta Z-Pont". A Z-BOX a Foxpost listajaban is "FOXPOST"
 * elotaggal all, a prompt szerint viszont Packeta Z-BOX. Ismeretlen tipus a
 * Foxpost szavaival marad: abbol sem lesz automata.
 */
export function foxpostPontTipus(variant: string | null | undefined): string {
  const nyers = (variant ?? "").trim()
  const kod = nyers.toUpperCase().replace(/\s+/g, " ")
  if (/\bZ-?BOX\b/.test(kod)) return "Packeta Z-BOX"
  if (/\bZ-?PONT\b/.test(kod)) return "Packeta Z-Pont / átvevőhely"
  if (/\bA-?BOX\b/.test(kod) || kod === "FOXPOST") return "FOXPOST automata"
  return nyers
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

/**
 * A "FOXPOST LETILTVA" ALLAPOT (Foxpost-prompt 7.5; Figma 486:346): ha egy
 * tetel miatt a FOXPOST nem jar, a sor nem csak eltunik, hanem a vevo latja,
 * melyik tetel miatt. A dontes a hattere (`/store/shipping-class`: az osztaly
 * es a donto sor); itt csak megnevezzuk.
 *
 * Csak akkor szol, ha FUTARRAL tovabbra is mehet (nehezaru, vagy "Foxpost
 * nelkul" tetel): a csak bolti atvetelt az atveteli sav mondja ki.
 */
const FOXPOST_NELKULI_OSZTALYOK = ["NO_FOXPOST", "HEAVY"]

export function foxpostTiltottTetel(
  tetelek: readonly {
    id: string
    title?: string | null
    product_title?: string | null
  }[],
  osztaly?: {
    shipping_class?: string | null
    shipping_class_source?: string | null
  } | null,
): string | null {
  if (!osztaly?.shipping_class) return null
  if (!FOXPOST_NELKULI_OSZTALYOK.includes(osztaly.shipping_class)) return null
  const tetel = tetelek.find((t) => t.id === osztaly.shipping_class_source)
  const nev = (tetel?.product_title ?? tetel?.title ?? "").trim()
  return nev || null
}

/** A Figma 486:346 "FOXPOST letiltva" mondata. */
export const foxpostTiltvaSzoveg = (tetel: string) =>
  `Ez a tétel nem küldhető automatába: ${tetel}.`
