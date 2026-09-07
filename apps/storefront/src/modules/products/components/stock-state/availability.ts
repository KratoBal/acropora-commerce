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
export type Availability = "KAPHATO" | "ELFOGYOTT" | "ELADVA";

export interface AvailabilityInput {
  /** A kirakat mai számítása: rendelhető-e egyáltalán. */
  inStock: boolean;
  /**
   * EGY DARAB, EZ A KONKRÉT PÉLDÁNY.
   *
   * KIFEJEZETT jelző, nem következtetés. Ma az OS oldalán a WYSIWYG szabály
   * csak `allow_backorder = false`-t ír, aminek a jelentése "nem rendelhető
   * előre" -- NEM "egy darab". Ha egy nem-WYSIWYG terméknél valaha kikapcsoljuk
   * az előrendelést, az proxyból "Eladva" feliratot kapna, és a vevő azt
   * olvasná, hogy a példány elkelt.
   */
  uniquePiece: boolean;
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
export function availabilityOf({
  inStock,
  uniquePiece,
}: AvailabilityInput): Availability {
  if (inStock) return "KAPHATO";
  return uniquePiece ? "ELADVA" : "ELFOGYOTT";
}

/** A vevőnek szánt felirat. Magyar, mert a bolt magyar. */
export const availabilityLabel: Record<Availability, string> = {
  KAPHATO: "Kosárba",
  ELFOGYOTT: "Elfogyott",
  ELADVA: "Eladva",
};

/**
 * AZ ELADVA ÁLLAPOTNAK NINCS KOSÁR-GOMBJA, HANEM TOVÁBBVISZ.
 *
 * Balázs döntése (2026-09-07 délelőtt): a helyén "Hasonló példányok megnézése"
 * áll. Egy letiltott gomb ugyanazt a zsákutcát adná, mint az "Out of stock":
 * a vevő látja, hogy nem kaphatja meg, és nem kap semmit helyette.
 */
export const SIMILAR_ITEMS_LABEL = "Hasonló példányok megnézése";

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
  if (typeof metadata !== "object" || metadata === null) return false;
  const value = (metadata as Record<string, unknown>)["unique_piece"];
  // A metaadat mezői szövegként is megérkezhetnek, ezért a "true" is számít.
  // Minden MÁS érték (hiányzó, üres, "false", 0) hamis: a jelzőt ki kell
  // MONDANI, nem elég, hogy nincs cáfolva.
  return value === true || value === "true";
}

/**
 * HOVÁ VISZ AZ "ELADVA" ÁLLAPOT TOVÁBBVIVŐ GOMBJA.
 *
 * A legszűkebb hely, ahol hasonló példány állhat: a termék saját gyűjteménye,
 * annak hiányában a kategóriája. Ha egyik sincs, a bolt főoldala -- az mindig
 * létezik, tehát a gomb soha nem visz halott címre.
 */
export function similarItemsHref(product: {
  collection?: { handle?: string | null } | null;
  categories?: { handle?: string | null }[] | null;
}): string {
  const collection = product.collection?.handle;
  if (collection) return "/collections/" + collection;

  const category = product.categories?.find((item) => item.handle)?.handle;
  if (category) return "/categories/" + category;

  return "/store";
}
