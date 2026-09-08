import { HttpTypes } from "@medusajs/types"

/**
 * A RENDELHETŐ MENNYISÉG HÁROM PARAMÉTERE EGY HELYEN LAKIK, ÉS EZ NEM
 * KÉNYELEM.
 *
 * A minimum, a lépésköz és a maximum UGYANANNAK a szabálynak a három
 * paramétere: mennyit tehet a vevő a kosárba. Ha külön fájlban állnának, egy
 * elutasított rendelésnél három helyen kellene megnézni, miért utasítottuk el
 * -- és aki egyszer felvesz egy negyediket, megint választhatna helyet.
 *
 * A fájl NEVE a minimumé maradt, mert egy átnevezés minden importot és minden
 * NÉVRE hivatkozó hálót érintene, a nyereség pedig kozmetikai. (A saját lapom
 * mérése: egy kézzel írt fájlnév-lista egy áthelyezés után nem pirosodik ki,
 * hanem CSENDBEN nulla soron mér tovább.)
 *
 * MIND A HÁROM ÉRTÉK A TERMÉK METAADATÁBAN ÉRKEZIK, a vetítés teszi oda:
 *
 *   unas_minimum_order_quantity   ennél kevesebbet nem lehet rendelni
 *   unas_order_quantity_step      ekkora ugrásokban lehet rendelni
 *   unas_maximum_order_quantity   ennél többet nem lehet rendelni
 *
 * === A POPULÁCIÓ MINDEN SZÁM MELLETT OTT ÁLL ===
 *
 * A minimumról a tárházban KÉT szám áll, és mind a kettő igaz: TIZENHAT a
 * 2026-09-02-i UNAS exporton (8 / 7 / 1 bontásban), TIZENNÉGY a teszt Medusa
 * mind az 1492 termékén (8 / 5 / 1). A második szűkebb halmaz. Populáció
 * nélkül a következő olvasó azt hinné, az egyik elavult, és "kijavítaná".
 *
 * A lépésköz és a maximum számai a TESZT BOLT 1492 termékén keltek
 * (2026-09-08, a Store API-n végiglapozva), nem a teljes 1896-os katalóguson
 * és nem az UNAS exporton:
 *
 *   lépésköz-kulcsot visel        15 termék
 *   ebből a lépésköz 1-nél nagyobb  12 termék
 *   maximumot visel                4 termék
 *
 * === ÉS EGY MÉRÉS, AMI A TESZTEK ALAKJÁT DÖNTÖTTE EL ===
 *
 * A tizenkét valódi lépésközös terméknél a LÉPÉSKÖZ MINDIG EGYENLŐ A
 * MINIMUMMAL (min 10 / lépés 10 hat terméknél, min 100 / lépés 100 ötnél,
 * min 10 / lépés 10 max 100 egynél).
 *
 * Ezért a valós adat NEM TUDJA eldönteni azt a kérdést, ami a rácsot
 * meghatározza: a megengedett értékek a minimumtól indulnak (`minimum + k *
 * lépés`), vagy a lépés TÖBBSZÖRÖSEI? Ha a lépés egyenlő a minimummal, a két
 * olvasat UGYANAZT adja, tehát egy valós fixtúra mindkét megvalósításon zöld
 * lenne -- díszlet, nem mérés.
 *
 * A választás a MINIMUMTÓL INDULÓ RÁCS, és az indoka szerkezeti: így a
 * minimum MAGA mindig rendelhető. A többszörös-olvasat egy min 3 / lépés 5
 * terméknél az 5-öt adná első értéknek, vagyis épp a minimumot zárná ki --
 * két szabály, ami ellentmond egymásnak.
 *
 * A tesztekben ezért SZÁNDÉKOS ütközés-fixtúra áll (min 3, lépés 5), ami a
 * mai katalógusban nem fordul elő. Ez nem kitalált adat: ez az az eset, ami a
 * két olvasatot szétválasztja, és külön is meg van jelölve.
 *
 * === AZ ÉRTÉK SZÖVEGKÉNT JÖN ===
 *
 * A metaadat JSON-mező, a vetítés sztringet ír bele ("1", "10", "100"), tehát
 * a szám-alakra nincs garancia. És mivel a mező a mi oldalunkon KÍVÜLRŐL kap
 * értéket, minden nem értelmezhető alak a BIZTONSÁGOS irányba esik vissza:
 *
 *   hibás minimum   ->  1        (ne zárja el a terméket)
 *   hibás lépésköz  ->  1        (ne tegyen elérhetetlenné mennyiségeket)
 *   hibás maximum   ->  null     (ne korlátozzon egy olvashatatlan érték)
 *
 * A három visszaesés iránya nem ízlés: mindhárom afelé esik, ahol egy hibás
 * metaadat NEM akadályozza meg a vásárlást.
 */

function metaSzam(
  product: Pick<HttpTypes.StoreProduct, "metadata"> | null | undefined,
  kulcs: string,
): number | null {
  const nyers = (
    product?.metadata as Record<string, unknown> | null | undefined
  )?.[kulcs]

  if (typeof nyers !== "string" && typeof nyers !== "number") return null

  const szam = Number(nyers)

  if (!Number.isFinite(szam) || !Number.isInteger(szam) || szam < 1) return null

  return szam
}

export function minimumOrderQuantity(
  product: Pick<HttpTypes.StoreProduct, "metadata"> | null | undefined,
): number {
  return metaSzam(product, "unas_minimum_order_quantity") ?? 1
}

export function orderQuantityStep(
  product: Pick<HttpTypes.StoreProduct, "metadata"> | null | undefined,
): number {
  return metaSzam(product, "unas_order_quantity_step") ?? 1
}

/**
 * `null`, ha nincs korlát -- és ez MÁS, mint a nulla vagy a végtelen.
 *
 * A hívó oldalán már áll egy másik felső határ, a KÉSZLET. A kettő külön
 * dolog: a készlet azt mondja meg, mennyi van, a rendelési maximum azt, hogy
 * mennyit engedünk egy rendelésbe. Egy `null` a "nincs ilyen korlát", nem a
 * "nulla darab".
 */
export function maximumOrderQuantity(
  product: Pick<HttpTypes.StoreProduct, "metadata"> | null | undefined,
): number | null {
  return metaSzam(product, "unas_maximum_order_quantity")
}

/**
 * A TELJES SZABÁLY EGY TISZTA FÜGGVÉNYBEN, mert eddig KÉT HELYEN állt.
 *
 * A `normaliseQuantity` szó szerint ugyanabban az alakban szerepelt a
 * `product-actions/index.tsx` és a `vasarlas/allapot.tsx` fájlban. Amíg
 * mindkettő csak a minimumot és a készletet ismerte, a másolat ártalmatlan
 * volt. A lépésközzel már nem az: aki csak az egyik helyre írja be, annál a
 * MÁSIK világ továbbra is egyesével léptet, és semmi nem szól.
 *
 * A KÉT FELSŐ HATÁR ÜTKÖZHET EGYMÁSSAL ÉS AZ ALSÓVAL IS. A sorrend:
 *
 *   1. a nem értelmezhető vagy a minimum alatti érték  ->  minimum
 *   2. rácsra igazítás LEFELÉ (minimum + k * lépés)
 *   3. a két felső határ közül a SZŰKEBB, majd újra rácsra igazítás lefelé
 *   4. ha az eredmény a minimum alá esne  ->  minimum
 *
 * A 4. pont az eredeti kód döntése, és megtartom: az ALSÓ határ nyer. Egy
 * 100-as minimumú termék két darabos készlettel mindkét határt nem tudja
 * teljesíteni, és ilyenkor a minimum megsértése HIBÁS RENDELÉST ad, a felső
 * határé csak utánrendelést. (A mai adatban a rendelési maximum SOHA nincs a
 * minimum alatt -- mind a négy terméknél 100/1000 vagy 10/100 --, tehát ezt az
 * ágat csak szándékos fixtúra méri.)
 *
 * A LEFELÉ IGAZÍTÁS a biztonságos irány: soha nem teszünk a kosárba többet,
 * mint amit a vevő kért.
 */
export function normaliseOrderQuantity(input: {
  value: number
  minimum: number
  step: number
  orderMaximum: number | null
  stockMaximum: number | null
}): number {
  const { value, minimum, orderMaximum, stockMaximum } = input
  const step = Number.isInteger(input.step) && input.step >= 1 ? input.step : 1

  if (!Number.isInteger(value) || value < minimum) return minimum

  const racsra = (ertek: number) =>
    minimum + Math.floor((ertek - minimum) / step) * step

  const felso = [orderMaximum, stockMaximum].filter(
    (hatar): hatar is number => typeof hatar === "number",
  )

  const igazitott = racsra(value)

  if (felso.length === 0) return igazitott

  const hatar = Math.min(...felso)

  if (hatar < minimum) return minimum

  return Math.max(minimum, racsra(Math.min(igazitott, hatar)))
}

/**
 * A MONDAT, AMI A LÉPTETŐ ALATT ÁLL -- ÉS AMIÉRT FÜGGVÉNY, NEM JSX.
 *
 * A léptető nem enged a minimum alá, nem enged a rácson kívülre, és nem enged
 * a maximum fölé. Mindhárom NÉMA korlát: a vevő azt látja, hogy a gomb nem
 * csinál semmit, és nem tudja, miért. Az eredeti kód ezt a minimumra már
 * kimondta; a lépésköz és a maximum ugyanezt igényli.
 *
 * A mondat csak akkor jelenik meg, ha VAN mit mondania. 1877 terméknél a
 * minimum 1 és nincs lépésköz -- ott a hallgatás a helyes válasz.
 *
 * TISZTA FÜGGVÉNY, mert két világ két külön JSX-fájlban rendereli
 * (`product-actions/index.tsx` és `vasarlas/dobozok.tsx`). Ha a szöveg a
 * JSX-ben állna, két helyen kellene egyeznie, és a két hely szét tudna
 * csúszni -- pontosan az a hiba, amit a `normaliseOrderQuantity` kiemelése
 * zárt le.
 */
export function orderQuantityHint(input: {
  minimum: number
  step: number
  orderMaximum: number | null
}): string | null {
  const { minimum, step, orderMaximum } = input

  /**
   * A NÉGY ESET KÜLÖN ÁLL, MERT A MONDAT NEM FŰZHETŐ ÖSSZE DARABOKBÓL.
   *
   * Egy `join`-os összefűzés a minimum nélküli lépésköznél nyelvtanilag hibás
   * mondatot adna ("Ebből a termékből és 5 darabonként növelhető."). A mai
   * katalógusban a lépésköz MINDIG egyenlő a minimummal, tehát ez az eset ma
   * nem áll elő -- de a szöveg a metaadatból dolgozik, és a metaadat kívülről
   * jön.
   */
  const also =
    minimum > 1 && step > 1
      ? `legalább ${minimum} darab rendelhető, és ${step} darabonként növelhető`
      : minimum > 1
        ? `legalább ${minimum} darab rendelhető`
        : step > 1
          ? `${step} darabonként rendelhető`
          : null

  const felso =
    typeof orderMaximum === "number"
      ? `legfeljebb ${orderMaximum} darab rendelhető`
      : null

  if (!also && !felso) return null

  if (also && felso) return `Ebből a termékből ${also}, de ${felso}.`

  return `Ebből a termékből ${also ?? felso}.`
}

/**
 * NÖVELHETŐ-E MÉG, ÉS EZT NEM A `>=` DÖNTI EL.
 *
 * A gomb eddig akkor volt tiltva, ha a mennyiség elérte a felső határt. Ez a
 * lépésközzel NÉMA KORLÁTOT ad: tizes lépésköznél és tizenöt darabos
 * készletnél a mennyiség 10, a `10 >= 15` hamis, tehát a gomb aktív marad --
 * és nem csinál semmit, mert a 20 már a készlet fölé esne.
 *
 * A helyes feltétel nem a határ összevetése, hanem hogy egy lépés
 * VÁLTOZTAT-E. Így a gomb pontosan akkor aktív, amikor van hova lépni, és a
 * néma korlát nem tud előállni.
 */
export function canIncreaseOrderQuantity(input: {
  quantity: number
  minimum: number
  step: number
  orderMaximum: number | null
  stockMaximum: number | null
}): boolean {
  return (
    normaliseOrderQuantity({ ...input, value: input.quantity + input.step }) >
    input.quantity
  )
}
