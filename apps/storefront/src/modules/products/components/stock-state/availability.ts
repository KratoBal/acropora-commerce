/**
 * HÁROM ÁLLAPOT, MERT KETTŐ HAZUDIK AZ EGYEDI PÉLDÁNYNÁL.
 *
 * A kirakat ma EGYETLEN logikai értéket ismer (`inStock`), és egyetlen feliratot
 * ("Out of stock"). Egy élő állat lapján ez két különböző dolgot mos össze:
 *
 *   ELFOGYOTT  nincs raktáron, de VISSZAJÖHET
 *   ELADVA     egyedi példány, ami MÁR NINCS -- soha nem jön vissza
 *
 * picasso mérése szerint a vevő azt hiheti, kap egy állatot, ami már nem létezik.
 */
export type Availability = "KAPHATO" | "ELFOGYOTT" | "ELADVA"

export interface AvailabilityInput {
  /** A kirakat mai számítása: rendelhető-e egyáltalán. */
  inStock: boolean
  /**
   * EGY DARAB, EZ A KONKRÉT PÉLDÁNY.
   *
   * KIFEJEZETT jelző, nem következtetés. Ma az OS oldalán a WYSIWYG szabály
   * csak `allow_backorder = false`-t ír, aminek a jelentése "nem rendelhető
   * előre" -- NEM "egy darab". Ha egy nem-WYSIWYG terméknél valaha kikapcsoljuk
   * az előrendelést, az proxyból "Eladva" feliratot kapna, és a vevő azt
   * olvasná, hogy a példány elkelt.
   */
  uniquePiece: boolean
  /**
   * TUDJUK-E EGYÁLTALÁN, MENNYI A KÉSZLET.
   *
   * === A HIÁNYZÓ SOR ÉS A MÉRT NULLA NEM UGYANAZ ===
   *
   * Mérve a stage boltban (acrobot, 2026-09-07): a négy WYSIWYG termékből
   * HÁROMNAK egyetlen készlet-sora sincs, és csak a negyediknél áll kimondott
   * nulla. Kívülről a kettő egyforma („nincs készlet"), de a második azt is
   * jelenti, hogy a készlet-vetítés SOHA nem futott rájuk.
   *
   * Balázs szabálya (2026-08-31) a MÉRT nullára szól: „a WYSIWYG item at zero
   * stock is SOLD". Egy soha nem mért termékre ugyanezt mondani annyi, mint
   * eladottnak nyilvánítani valamit, amiről senki nem tud semmit -- és ez a
   * HANGOS tévedés: a vevő elmegy, és nem jön vissza megnézni.
   *
   * Ezért az ELADVA ághoz MÉRT nulla kell. Ha nem tudjuk, a lap ELFOGYOTT-at
   * mutat: ugyanaz a halkabb tévedés, amit a hiányzó jelzőnél is választottunk.
   *
   * Az alapértelmezés `true`, hogy a meglévő hívók viselkedése ne változzon
   * attól, hogy ez a mező megjelent.
   */
  inventoryKnown?: boolean
}

/**
 * A HIÁNYZÓ JELZŐ ELFOGYOTT-AT AD, SOHA NEM ELADVÁT -- ÉS EZ NEM ÓVATOSSÁG.
 *
 * A két lehetséges téves állítás ára nem egyforma:
 *   téves "elfogyott"  a vevő később visszatér, és csalódik            -- HALK
 *   téves "eladva"     a vevő elmegy, és nem jön vissza megnézni       -- HANGOS
 *
 * Amíg a jelző nem érkezik meg a boltba, a halkabb tévedést választjuk.
 */
/**
 * ES EGY DOLOG A MAI ARANYOKROL, MERT KULONBEN A KOVETKEZO OLVASO FELREERTI:
 * AZ `ELFOGYOTT` MA NEM AZ ALTALANOS ESET, HANEM AZ ATMENET.
 *
 * A bolt oldalan az `inStock` IGAZ, ha az `allow_backorder` igaz, a vetites
 * WYSIWYG szabalya pedig a NEM-WYSIWYG termekekre igazra allitja. Vagyis ez az
 * ag ma pontosan a WYSIWYG termekeket fogja meg -- azokat, amiknel a dontes
 * szerint majd `ELADVA` all, amint a `unique_piece` jelzo megerkezik.
 *
 * (acrobot mondta ki, 2026-09-07. Azert all itt, mert egy ag, ami ma gyakori,
 * de holnap ritka lesz, konnyen kap folosleges optimalizalast attol, aki csak a
 * mai szamokat latja.)
 */
export function availabilityOf({
  inStock,
  uniquePiece,
  inventoryKnown = true,
}: AvailabilityInput): Availability {
  if (inStock) return "KAPHATO"
  return uniquePiece && inventoryKnown ? "ELADVA" : "ELFOGYOTT"
}

/**
 * A vevőnek szánt felirat. Magyar, mert a bolt magyar.
 *
 * === MIÉRT "NINCS RAKTÁRON", ÉS MIÉRT NEM "ELFOGYOTT" ===
 *
 * Balázs döntése, szó szerint (efb09c9a kártya): „A tobbinel NIncs raktaron,
 * rendelheto". A két szó nem szinonima: az **elfogyott** véget jelent, a **nincs
 * raktáron** állapotot. Ezen a lapon a különbség a vevő elé kerül, mert a
 * VÉGLEGES esetnek külön állapota van (`ELADVA`).
 *
 * Az ÁLLAPOT NEVE marad `ELFOGYOTT`: az a mi belső fogalmunk, és a felirat
 * cseréje nem szabad, hogy a kód szótárát is átírja. A kettő külön él, ezért
 * lehet a feliratot egy sorban cserélni.
 */
export const availabilityLabel: Record<Availability, string> = {
  KAPHATO: "Kosárba",
  ELFOGYOTT: "Nincs raktáron",
  /**
   * "NEM ELERHETO", NEM "ELADVA" -- ES EZ IGEIDO-KERDES, NEM SZOHASZNALAT.
   *
   * Az "Eladva" ALLITAS A MULTROL: azt mondja a vevonek, hogy valaki MEGVETTE
   * ezt a peldanyt. Erre nincs jelunk. Merve (2026-09-07, staging): a bolt
   * MINDEN termeke nulla keszleten all, tehat a nulla nem meres, hanem az
   * atvitel hianya -- egy sosem keszletezett korall ugyanugy nullan all, mint
   * egy tenylegesen elkelt.
   *
   * Acrobot dontese a MAGYARAZO MONDATRA szolt (14559): abbol kikerult a mult
   * ideju allitas. EZT A SORT EN VETTEM HOZZA, mert ugyanaz a hiba all benne,
   * es a ket szoveg egymas alatt jelenik meg: egy "Eladva" cimke egy "Ez a
   * darab nem elerheto" mondat folott onmaganak mondana ellent.
   *
   * Ha ezt tulzasnak latja, EGY sor cserel vissza.
   *
   * ES AMI VALTOZATLAN: az allapot MEGMARAD, es kulonbozik az ELFOGYOTT-tol.
   * Balazs harom allapotot kert, es ez a harmadik IGAZ resze: ez a peldany nem
   * elerheto, es nem is potolhato.
   */
  ELADVA: "Nem elérhető",
}

/**
 * AZ ELADVA ÁLLAPOT MAGYARÁZÓ MONDATA (picasso látványterve, 2026-09-07).
 *
 * A puszta "Eladva" nem mondja meg, hogy ez VÉGLEGES. E nélkül a vevő ugyanúgy
 * visszatérhet holnap, mint egy elfogyott termékhez, és hiába.
 *
 * A tervben két kötőjel áll elválasztójelként; itt két mondat, mert a magyar
 * szedésben a két kötőjel nem helyes alak, és a lapon ez látszik.
 */
/**
 * A MAGYARAZAT, ES BENNE EGYETLEN IGEIDO DONT MINDENT (acrobot, 14559).
 *
 *   ma:       "Egyedi darab VOLT, nem potolhato. Nem kerul vissza raktarra."
 *   helyette: "Egyedi peldany, nem potolhato. Ez a darab nem elerheto."
 *
 * A "nem potolhato" IGAZ a termek termeszetebol: egy konkret korall-telep vagy
 * megvan a boltban, vagy nincs -- ujat rendelni ugyanabbol nem lehet.
 *
 * Az "Egyedi darab VOLT" viszont ALLITAS A MULTROL: azt mondja, valaki
 * MEGVETTE. Erre nincs jelunk, es a meres meg is mutatta, miert: a bolt minden
 * termeke nulla keszleten all, tehat a nulla nem meres.
 *
 * Nem az ALLAPOT volt hamis, hanem az IGEIDO.
 *
 * === ES A MASODIK MONDAT VISSZAKERULT (acrobot, 14679) ===
 *
 * Elsore "Ez a darab nem elerheto."-re csereltem az egesz masodik mondatot.
 * Az REDUNDANS volt: pontosan azt mondja, ami a FOLOTTE allo cimke
 * ("Nem elérhető"), tehat egy sorral lejjebb megismetli ugyanazt.
 *
 * A "Nem kerul vissza raktarra" viszont HOZZATESZ valamit, es NEM a multrol
 * szol: egy konkret korall-telep vagy hal nem potolhato, tehat nem is kerulhet
 * vissza raktarra. Ez a termek TERMESZETEBOL kovetkezik, nem egy vasarlasbol.
 *
 * Az ag amugy is CSAK egyedi peldanyra fut (uniquePiece), tehat a mondat
 * hatokore pontosan az, amire igaz.
 */
export const SOLD_OUT_EXPLANATION =
  "Egyedi példány, nem pótolható. Nem kerül vissza raktárra."

/**
 * A WYSIWYG-ÍGÉRET, KIMONDVA (picasso látványterve, 2026-09-07).
 *
 * A jelvény önmagában félreérthető: aki először látja, nem tudja, mit jelent az
 * "egyedi példány". Ez a mondat a kép ALATT áll, kis betűvel.
 *
 * A tervben itt is két kötőjel állt; kettősponttá írva, ugyanabból az okból.
 */
export const UNIQUE_PIECE_PROMISE =
  "A fotó pontosan ezt a példányt mutatja: ezt kapod, nem egy hasonlót."

/**
 * AZ ELADVA ÁLLAPOTNAK NINCS KOSÁR-GOMBJA, HANEM TOVÁBBVISZ.
 *
 * Balázs döntése (2026-09-07 délelőtt): a helyén "Hasonló példányok megnézése"
 * áll. Egy letiltott gomb ugyanazt a zsákutcát adná, mint az "Out of stock":
 * a vevő látja, hogy nem kaphatja meg, és nem kap semmit helyette.
 */
export const SIMILAR_ITEMS_LABEL = "Hasonló példányok megnézése"

/**
 * A JELZŐ FORRÁSA: A TERMÉK METAADATA, KIFEJEZETTEN.
 *
 * === MIT MÉR, ÉS MIT NEM ===
 *
 * Ez a függvény azt mondja meg, hogy a bolt oldalán MEGÉRKEZETT-E a jelző. Azt
 * NEM mondja meg, hogy a termék valóban egyedi példány-e: azt az OS oldalán a
 * WYSIWYG kapcsoló dönti el, és a vetítésnek kell áthoznia.
 *
 * === A MÉRT ÁLLAPOT (2026-09-07, staging) ===
 *
 * A vetítés ma EGYETLEN ilyen jelzőt sem ír a termék metaadatába: a WYSIWYG
 * szabály csak `allow_backorder = false`-t állít, aminek a jelentése "nem
 * rendelhető előre", NEM "egy darab". Ezért ez a függvény ma minden terméknél
 * hamisat ad, és a lap az ELFOGYOTT ágat rajzolja.
 *
 * Ez SZÁNDÉKOS, nem hiányosság: amíg a jelző nem érkezik meg, a halkabb tévedést
 * választjuk. A vetítés kiegészítése külön tétel az OS oldalán.
 *
 * === MIÉRT NEM AZ `allow_backorder`-BŐL SZÁRMAZTATJUK ===
 *
 * Az proxy lenne, nem jelző. Ha egy nem-WYSIWYG terméknél valaha kikapcsoljuk az
 * előrendelést, a lapra "Eladva" kerülne, és a vevő azt olvasná, hogy a példány
 * elkelt -- holott csak a raktár ürült ki.
 */
export function uniquePieceOf(metadata: unknown): boolean {
  if (typeof metadata !== "object" || metadata === null) return false
  const value = (metadata as Record<string, unknown>)["unique_piece"]
  // A metaadat mezői szövegként is megérkezhetnek, ezért a "true" is számít.
  // Minden MÁS érték (hiányzó, üres, "false", 0) hamis: a jelzőt ki kell
  // MONDANI, nem elég, hogy nincs cáfolva.
  return value === true || value === "true"
}

/**
 * HOVÁ VISZ AZ "ELADVA" ÁLLAPOT TOVÁBBVIVŐ GOMBJA.
 *
 * A legszűkebb hely, ahol hasonló példány állhat: a termék saját gyűjteménye,
 * annak hiányában a kategóriája. Ha egyik sincs, a bolt főoldala -- az mindig
 * létezik, tehát a gomb soha nem visz halott címre.
 *
 * === A GYŰJTEMÉNY-ÁG MA NEM PRÓBÁLHATÓ KI VALÓDI ADATON ===
 *
 * Mérve 2026-09-07 (acrobot, két irányból): a boltban NULLA gyűjtemény áll, és
 * az első száz termék mindegyikén `collection_id = null`. A vetítés ma
 * egyáltalán nem hoz létre gyűjteményt.
 *
 * Vagyis a három ág közül az ELSŐ soha nem fut le: minden termék a kategóriára
 * esik. Ez NEM hiba és nem javítandó -- a sorrend akkor is helyes, ha ma az
 * első ág nem talál semmit. Ha valaha lesz gyűjtemény, ez az ág lép először.
 *
 * A dátum azért áll itt, mert e nélkül fél év múlva ez az ág holt kódnak
 * látszana, holott csak MÉG NEM ELÉRT állapot.
 */
export function similarItemsHref(product: {
  collection?: { handle?: string | null } | null
  categories?: { handle?: string | null }[] | null
}): string {
  const collection = product.collection?.handle
  if (collection) return "/collections/" + collection

  const category = product.categories?.find((item) => item.handle)?.handle
  if (category) return "/categories/" + category

  return "/store"
}

/**
 * A SAV GOMBJA VALTOZAT NELKUL KERDEZ, ES EZ NEM PONTATLANSAG.
 *
 * === A MERT HIBA, AMI EZT ELOHOZTA (picasso talalta, acrobot merte vissza,
 * 2026-09-08, kartya 415f455c) ===
 *
 * Az `acropora-austea-tricolor` lapjan a fo oszlop mar a "Hasonló példányok
 * megnézése" gombot mutatta (ELADVA ag), az also ragados savban viszont AKTIV,
 * rez hatteru "Kosárba" allt. Egy peldany, amibol EGY darab van es elkelt, ket
 * kulonbozo dolgot mondott ugyanazon a lapon.
 *
 * Visszamerve a kiszolgalt lapon (2026-09-08): a "Kosárba" ketszer szerepel a
 * HTML-ben, mind a ketto a sav ugro linkje, es a metaadatban ott all a
 * `unique_piece: "true"`.
 *
 * === MIERT VALTOZAT NELKUL, HOLOTT A FO OSZLOP A VALASZTOTT VALTOZATOT NEZI ===
 *
 * A sav gombja NEM kosarba tesz, hanem A VALASZTORA UGRIK (acrobot dontese,
 * 14504). Ezert a helyes kerdes nem az, hogy a most valasztott valtozat
 * megveheto-e, hanem hogy a valaszto vezet-e BARHOVA: ha egyetlen valtozat sem
 * megveheto, akkor a valasztas nem tud ezen valtoztatni, tehat a "Kosárba"
 * felirat MINDEN valasztas mellett hamis.
 *
 * Ugyanaz az alak, mint az arnal: a sav a `ProductPrice` VALTOZAT NELKULI
 * alakjat mutatja, mert a vevo a savot akkor latja, amikor a valasztotol mar
 * elgorgetett.
 *
 * === A SZABALY BETU SZERINT UGYANAZ, MINT A FO OSZLOPE ===
 *
 * A harom feltetel az `allapot.tsx` `inStock` szamitasabol jon, valtoztatas
 * nelkul. Ha az ott valaha modosul, ennek is modosulnia kell: a ket helyen allo
 * EGY szabaly az a hibafajta, amit a lapunk kulon nevesit.
 */
export function variantPurchasable(variant: {
  manage_inventory?: boolean | null
  allow_backorder?: boolean | null
  inventory_quantity?: number | null
}): boolean {
  if (!variant.manage_inventory) return true
  if (variant.allow_backorder) return true
  return (variant.inventory_quantity || 0) > 0
}

/**
 * MEGVEHETO-E A TERMEK BARMELYIK VALTOZATA.
 *
 * A VALTOZAT NELKULI termek (ures vagy hianyzo lista) HAMIS: nincs mit a
 * kosarba tenni, es a valaszto sem vezet sehova. Ez NEM ugyanaz, mint a
 * "nem tudjuk" -- azt az `inventoryKnownOf` mondja meg kulon.
 */
export function anyVariantPurchasable(product: {
  variants?:
    | {
        manage_inventory?: boolean | null
        allow_backorder?: boolean | null
        inventory_quantity?: number | null
      }[]
    | null
}): boolean {
  return (product.variants ?? []).some(variantPurchasable)
}

/**
 * TUDJUK-E A KESZLETET MINDEN OLYAN VALTOZATNAL, AMELYIKNEL EZ KERDES.
 *
 * MINDEN valtozatot megkovetel, nem csak egyet, es ez SZANDEKOS: ha akar egy
 * keszletezett valtozatnal hianyzik a szam, a lap ELFOGYOTT-at mutat ELADVA
 * helyett. Ez a modul mar kimondta, melyik tevedes olcsobb: a teves
 * "elfogyott" HALK (a vevo visszater), a teves "eladva" HANGOS (a vevo elmegy).
 * A szigorubb feltetel tehat a halkabb tevedes fele visz.
 */
export function inventoryKnownOf(product: {
  variants?:
    | {
        manage_inventory?: boolean | null
        inventory_quantity?: number | null
      }[]
    | null
}): boolean {
  return (product.variants ?? []).every(
    (variant) =>
      !variant.manage_inventory ||
      typeof variant.inventory_quantity === "number",
  )
}
