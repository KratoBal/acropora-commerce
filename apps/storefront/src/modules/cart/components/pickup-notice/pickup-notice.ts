/**
 * MIKOR CSAK SZEMÉLYES ÁTVÉTEL VÁLASZTHATÓ (Balázs szabálya, 2026-08-31).
 *
 * Ha a kosárban ÉLŐ ÁLLAT van, akkor az EGÉSZ kosárra csak a személyes átvétel
 * marad. Nem bontjuk két rendelésre, és nem kérdezzük meg, hogy a többit
 * postázzuk-e.
 *
 * === A HELYETTESITO JEL MEGSZUNT, ES EZ A FAJL A BIZONYITEKA ===
 *
 * Ez a modul korabban az EGYEDI PELDANY jelzojebol (`unique_piece`) dolgozott,
 * mert elo allat jelzo nem volt a boltban. A sajat fejlece akkor KIMONDTA a
 * korlatjat: "egy hasznalt eszkoz is lehet egyedi darab anelkul, hogy elne",
 * es megnevezte, mi valtja majd fel.
 *
 * Az a felvalto megerkezett. Az OS oldalan a `pickupOnly` zaszlo a HAROM ELO
 * ALLAT GYOKERKATEGORIABOL szarmazik (Korallok, Halak, Gerinctelenek, os #601),
 * a commerce `#86` pedig kozzeteszi a `store/shipping-class` vegponton -- a
 * KIVALTO SOR azonositojaval egyutt.
 *
 * A proxy-fuggveny ezzel TOROLVE lett, nem csak megkerulve. Amig egy felvaltott
 * jel ott all hasznalhato allapotban, valaki ujra bekoti: a kovetkezo olvaso
 * nem tudja rola, hogy mast mer, mint aminek latszik.
 */

/**
 * A VALODI JEL: A HATTEROLDAL SZALLITASI OSZTALYA, ES AZ OKA.
 *
 * === MIERT VALTJA FEL A PROXYT ===
 *
 * A `pickupOnlyLines` a `unique_piece` jelzobol dolgozott, ami EGY DARABOT
 * jelent, nem elo allatot. Iranyaban biztonsagos volt (egy fagyasztott aru
 * kimaradt volna, egy egyedi eszkoz feleslegesen bekerult volna), de nem az a
 * kerdes, amire a szabaly szol.
 *
 * A hatteroldal PICKUP_ONLY osztalya viszont pontosan azt allitja: ezt a
 * kosarat boltban adjuk at. Harom kimondott zaszlobol dol (`pickup_only`,
 * `is_frozen`, `is_livestock`), es a `pickup_only` maga a harom elo allat
 * gyoker-kategoriabol szarmazik (os #601).
 *
 * === ES AMIT A SOURCE AD, ES A KOVETKEZTETES SOHA NEM TUDNA ===
 *
 * A valasz megmondja, MELYIK SOR idezte elo. A kirakat ebbol nevet tud mondani,
 * mert a kosar sorai a kezeben vannak. Egy kovetkeztetes ("csak a szemelyes
 * atvetel jott vissza") ugyanezt SOHA nem tudna -- es egy sav, ami annyit mond,
 * hogy "valamelyik tetel miatt", ugyanolyan hasznalhatatlan a vevonek, mint a
 * semmi, csak magabiztosabb.
 */
export interface CartLineName {
  id: string
  title: string
}

/**
 * AZOK A TETELEK, AMIK MIATT CSAK BOLTI ATVETEL VAN -- a valodi jelbol.
 *
 * A `null` osztaly (a vegpont nem valaszolt) URES listat ad: nem allitunk
 * korlatozast, amirol nem tudunk.
 *
 * ES HA AZ OSZTALY PICKUP_ONLY, DE A SORT NEM TALALJUK: a lista ures marad, a
 * sav viszont a HIVO dontese szerint akkor is megjelenhet. Ez a hataresetet
 * NEM elrejti, hanem megnevezi: a korlatozas valos, csak a megnevezes hianyzik.
 */
export function pickupOnlyLinesFromClass(
  shippingClass: string | null | undefined,
  shippingClassSource: string | null | undefined,
  lines: readonly CartLineName[],
): string[] {
  if (shippingClass !== "PICKUP_ONLY") return []
  const sor = lines.find((line) => line.id === shippingClassSource)
  return sor ? [sor.title] : []
}

/**
 * A SAV OSSZES BEMENETE, EGY HELYEN -- ES EZ NEM STILUS, HANEM MERHETOSEG.
 *
 * A kosar sablonja SZERVER-komponens: a lancaban `server-only` modul all,
 * ezert jsdom-ban NEM RENDERELHETO (merve: a rea iranyulo spec module-szinten
 * elszallt, "This module cannot be imported from a Client Component module").
 * Amig a bekotes JSX-ben allt, semmilyen teszt nem lathatta.
 *
 * Ez a "nem merheto hely" esete, es annak egyetlen feloldasa a KOD
 * ELMOZDITASA. Ami ide kerult, az mostantol merheto:
 *
 *   - a kosar sorainak lekepezese nevre (`product_title` kontra `title`)
 *   - a forras-sor kivalasztasa
 *   - a lathatosag
 *
 * AMI EZUTAN IS MERETLEN MARAD, ES KIMONDOM: hogy a sablon MEGHIVJA-E ezt a
 * fuggvenyt. Az egy sor, es a szakadas oda mar nem fer be eszrevetlenul --
 * de nem allitom, hogy meg van merve.
 */
export interface PickupNoticeProps {
  visible: boolean
  lines: string[]
}

export function pickupNoticeProps(
  items: readonly {
    id: string
    title?: string | null
    product_title?: string | null
  }[],
  shippingClass?: {
    shipping_class: string
    shipping_class_source: string | null
  } | null,
): PickupNoticeProps {
  return {
    visible: pickupNoticeVisible(shippingClass?.shipping_class),
    lines: pickupOnlyLinesFromClass(
      shippingClass?.shipping_class,
      shippingClass?.shipping_class_source,
      items.map((item) => ({
        id: item.id,
        /**
         * A TERMEK NEVE ELOZI MEG A SOR NEVET. A sor `title` mezoje a
         * VALTOZAT neve ("Kicsi", "Kek") -- az onmagaban nem mondana meg a
         * vevonek, melyik tetel miatt all a korlatozas.
         */
        title: item.product_title ?? item.title ?? "",
      })),
    ),
  }
}

/** Megjelenjen-e a sav egyaltalan. */
export function pickupNoticeVisible(
  shippingClass: string | null | undefined,
): boolean {
  return shippingClass === "PICKUP_ONLY"
}

/** A sáv címe. Ténykozlés, nem tiltás. */
export const PICKUP_TITLE = "Élő állat a kosárban"

/** A mondat, ami megmondja, mi történik. */
export const PICKUP_LEAD = "Ezt a rendelést a boltban adjuk át."

/**
 * A MAGYARÁZAT, ÉS EZ NEM UDVARIASSÁG.
 *
 * A terv kikötése: a vevőnek EL KELL MAGYARÁZNI, a kosárban, nem a fizetésnél,
 * és nem hibaüzenetként. Egy élő állatot nem adunk fel csomagként -- ha ez nincs
 * kimondva, a korlátozás önkényesnek látszik.
 */
export const PICKUP_REASON =
  "Egy élő példányt nem adunk fel csomagként, ezért a rendelés többi tételét is a boltban adjuk át."

/** A bolt címe és nyitvatartása, a tervből. */
export const SHOP_ADDRESS = "1106 Budapest, Pesti Gábor utca 35"
export const SHOP_HOURS = "Kedd–Péntek 10–18, Szombat 10–14"

/** Meddig tartjuk fenn a példányt. A tervben álló ígéret. */
export const HOLD_PROMISE = "Az élő példányt 5 munkanapig tartjuk fenn."
