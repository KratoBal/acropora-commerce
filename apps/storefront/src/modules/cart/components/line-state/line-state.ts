import { uniquePieceOf } from "@modules/products/components/stock-state/availability"

/**
 * A KOSÁRSOR HÁROM ÁLLAPOTA (Balázs terve, kosar-2026-09-07).
 *
 * A terméklap három állapota a MEGVEHETŐSÉGRŐL szól; a kosáré arról, hogy mi
 * történt AZZAL A TÉTELLEL, amit a vevő már betett:
 *
 *   NORMAL   megy tovább, a mennyiség állítható
 *   EGYEDI   egy darab, ez a példány: a mennyiség NEM növelhető
 *   ELKELT   amíg a kosárban volt, valaki más megvette
 */
export type CartLineState = "NORMAL" | "EGYEDI" | "ELKELT";

export interface CartLineInput {
  /** A termék metaadata a boltból: innen jön a kifejezett jelző. */
  productMetadata: unknown;
  /**
   * MEGVEHETŐ-E MÉG. A kosársornál ez NEM ugyanaz a kérdés, mint a terméklapon:
   * ott a lap betöltésekor nézzük, itt a vevő döntése UTÁN.
   */
  stillAvailable: boolean;
}

/**
 * A SORRENDBEN AZ ELKELT ELŐZI AZ EGYEDIT, ÉS EZ NEM ÍZLÉS.
 *
 * Egy elkelt példány EGYEDI IS, de a vevőnek nem azt kell megtudnia, hogy
 * egyedi, hanem hogy MÁR NINCS. A fordított sorrend egy "1 db, egyedi" jelvényt
 * tenne egy olyan sor mellé, amit épp törölni kell.
 */
export function cartLineStateOf({
  productMetadata,
  stillAvailable,
}: CartLineInput): CartLineState {
  const egyedi = uniquePieceOf(productMetadata);
  if (egyedi && !stillAvailable) return "ELKELT";
  return egyedi ? "EGYEDI" : "NORMAL";
}

/**
 * A KOSÁRBAN "ELKELT" ÁLL, NEM "ELADVA" -- ÉS A KÜLÖNBSÉG MÉRT, NEM ÍZLÉS.
 *
 * acrobot döntése (2026-09-07), picasso leletéből: a két szó két KÜLÖNBÖZŐ
 * pillanatot ír le. A terméklapon a példányt korábban vették meg, tehát a vevő
 * csak nézelődött. A kosárban viszont MÁR DÖNTÖTT, és közben kelt el -- ez a
 * rosszabb élmény, és jár neki a pontosabb mondat.
 */
export const CART_LINE_LABEL: Record<CartLineState, string> = {
  NORMAL: "",
  EGYEDI: "1 db · Egyedi",
  ELKELT: "Elkelt",
};

/** A mennyiség-léptető helyén álló szöveg egyedi példánynál. */
export const NOT_INCREMENTABLE = "Nem növelhető";

/**
 * A WYSIWYG-ígéret KOSÁR-BELI alakja, a tervből szó szerint.
 *
 * Nem ugyanaz, mint a terméklapé („ezt kapod, nem egy hasonlót"): ott a vevő
 * még választ, itt már a kosarába tette, ezért a mondat a KOSÁRRÓL beszél.
 */
export const UNIQUE_IN_CART_PROMISE =
  "A fotón pontosan ezt a példányt látod: ez kerül a kosaradba";

/** Az elkelt példány sorában a továbbvivő hivatkozás felirata. */
export const SIMILAR_PIECES_LABEL = "Hasonló példányok";
