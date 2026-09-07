/**
 * Livestock (corals, fish) resolution.
 *
 * Corals and fish must be collected in store, exactly like an explicitly
 * pickup-only product. Medusa has no livestock concept, and product names,
 * titles, tags and SKU patterns must not drive business logic, so this is the
 * one isolated place where livestock is decided.
 *
 * The decision is made on `ProductType.id`, which is a structured, opaque
 * identifier rather than a human-editable label. The ids are supplied through
 * configuration because the stage catalogue does not have a livestock product
 * type yet.
 *
 * DEFAULT: empty, meaning nothing is livestock by type. That is deliberately
 * safe rather than clever: until a type exists, corals and fish are covered by
 * the `pickup_only` flag on the shipping-attributes record, which produces the
 * same PICKUP_ONLY outcome. Nothing silently guesses.
 *
 * When a livestock product type is created, set the environment variable and no
 * code changes are needed:
 *
 *   ACROPORA_LIVESTOCK_PRODUCT_TYPE_IDS=ptyp_123,ptyp_456
 */
/**
 * === HOL LAKIK MEG UGYANEZ A KERDES: NEGY HELY, KET REPO ===
 *
 * Az "elo allat-e ez a termek" (es a rokona, az "egyedi darab-e") kerdesre MA
 * NEGY kulonbozo szabaly valaszol, ket kulon repoban. Kozos konstanst nem lehet
 * megosztani kozottuk, ezert a szerzodes CSAK KIMONDVA letezik:
 *
 *   acropora-os / medusa-wysiwyg.policy.ts
 *       a "WYSIWYG" kategoria RESZFAJA -> egyedi darab (rendelhetoseg, jelzo)
 *
 *   acropora-os / medusa-livestock.policy.ts
 *       a HAROM ELO ALLAT GYOKER (Korallok, Halak, Gerinctelenek)
 *       -> bolti atvetel (pickup_only)
 *
 *   acropora-commerce / modules/products/components/lap-vaz/vilag-valto.ts
 *       UGYANAZ A HAROM NEV -> a kirakat sotet-vilagos valtoja
 *
 *   acropora-commerce / workflows/utils/livestock.ts
 *       termek-TIPUS azonositok egy kornyezeti valtozobol (MA URES)
 *       -> a szallitasi osztaly livestock-aga
 *
 * A KETTO, AMI EGYUTT MOZOG: a masodik es a harmadik UGYANAZT a harom nevet
 * tartalmazza, ket kulon repoban. Ha az egyik valtozik, a masikat AT KELL
 * NEZNI -- kulonben az egyik oldal mar elo allatnak tart valamit, amit a masik
 * nem, es a kulonbseg sehol nem hasal el.
 *
 * (acrobot kerese, 2026-09-07. A negyedik hely aznap este keletkezett, ezert az
 * o listajaban meg harom szerepelt.)
 */
export const LIVESTOCK_PRODUCT_TYPE_IDS_ENV =
  "ACROPORA_LIVESTOCK_PRODUCT_TYPE_IDS";

export const parseLivestockProductTypeIds = (
  raw: string | undefined | null,
): Set<string> =>
  new Set(
    (raw ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
  );

/**
 * Returns a predicate rather than reading the environment on every item, so the
 * caller resolves configuration once and the decision stays pure.
 */
export const createLivestockPredicate = (
  raw: string | undefined | null = process.env[LIVESTOCK_PRODUCT_TYPE_IDS_ENV],
) => {
  const ids = parseLivestockProductTypeIds(raw);

  return (productTypeId?: string | null): boolean =>
    !!productTypeId && ids.has(productTypeId);
};
