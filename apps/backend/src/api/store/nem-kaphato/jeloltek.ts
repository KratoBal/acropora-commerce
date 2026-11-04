/**
 * A NEM KAPHATO TERMEK LAPJANAK JELOLTJEI (V4.2, kartya 9d0523fa) -- TISZTA
 * DONTES, adatbazis nelkul, hogy minden ag unit-tesztelheto legyen.
 *
 * === KET LISTA, MERT KET KULON ALLITAS (acrobot 42186) ===
 *
 *   helyette   a UNAS-ban KEZZEL megadott hasonlo kapcsolat (`unas_similar_ids`):
 *              ember allitotta, hogy ez a termek helyett johet, tehat a lap
 *              "Ezeket talaltuk helyette" cime alatt all.
 *   hasonlo    gepi jelolt: ugyanabban az elsodleges kategoriaban, ugyanattol a
 *              markatol. Ezt senki nem hagyta jova helyettesitokent, ezert NEM a
 *              "helyette" cim alatt, hanem kulon, "Hasonlo termekek ugyanabbol a
 *              kategoriabol" cimmel.
 *
 * A csak-kategoria jelolt (polip mereseben 78 termek) es a semmi (39) ebben a
 * szeletben nem ad listat: a lap a "nem talalunk kozvetlen helyettesitot"
 * mondatot kapja. A jovahagyo lista (amivel egy gepi jelolt "helyette" lehet)
 * kulon szelet.
 *
 * MINDKET LISTA CSAK MEGVEHETO TERMEKET HORDOZ: publikalt, a kirakat
 * csatornajan. Egy masik kifutott termekre mutato "helyette" zsakutca lenne.
 */

/** Ugyanaz a hatar, mint a kirakat gondozott kapcsolatainal (`KAPCSOLAT_HATAR`). */
export const HELYETTE_HATAR = 12;
export const HASONLO_HATAR = 8;

/** A vetites kulcsa (acropora-os `MEDUSA_SIMILAR_IDS_KEY`; a kirakat `HASONLO_KULCS`-a). */
export const HASONLO_KULCS = "unas_similar_ids";

/**
 * A KIFUTOTT JELOLO (acropora-os `DISCONTINUED_KEY`, `medusa-metadata-merge.ts`):
 * a vetites `"true"`-t ir, ha a termek inaktiv vagy nem webshopos, ES volt
 * publikus UNAS-lapja. A vegpont CSAK ilyen termekre valaszol: egy keszulo, meg
 * soha nem publikus termek neve a handle-jebol ne legyen kiolvashato. Ket repo,
 * kozos csomag nelkul: ha a ket sztring elter, a lap csendben 404 marad.
 */
export const KIFUTOTT_KULCS = "discontinued";

export function kifutott(
  metadata: Record<string, unknown> | null | undefined,
): boolean {
  return metadata?.[KIFUTOTT_KULCS] === "true";
}

/** A vetites kulcsa az elsodleges kategoriara (acropora-os, a termek metaadata). */
export const ELSODLEGES_KATEGORIA_KULCS = "primary_category_id";

/**
 * A metaadat vesszovel elvalasztott azonosito-listaja, ures es ismetelt elem
 * nelkul. A kirakat `kapcsolatAzonositok`-javal azonos szabaly; a ket repo kozott
 * nincs kozos csomag, ezert itt is all.
 */
export function explicitAzonositok(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  const nyers = metadata?.[HASONLO_KULCS];
  if (typeof nyers !== "string") return [];
  const latott = new Set<string>();
  for (const darab of nyers.split(",")) {
    const id = darab.trim();
    if (id) latott.add(id);
  }
  return [...latott];
}

export type Kategoria = { id: string; name: string; handle: string };

/**
 * Az elsodleges kategoria: a vetites altal kiirt `primary_category_id`, ha a
 * termek kategoriai kozott van; kulonben nincs (a sorrendre nem tippelunk: a
 * Medusa kategoria-listaja nem rendezett).
 */
export function elsodlegesKategoria(
  metadata: Record<string, unknown> | null | undefined,
  kategoriak: readonly Kategoria[] | null | undefined,
): Kategoria | null {
  const id = metadata?.[ELSODLEGES_KATEGORIA_KULCS];
  if (typeof id !== "string" || !id) return null;
  return kategoriak?.find((k) => k.id === id) ?? null;
}

/**
 * A ket lista a jeloltekbol. `megveheto`: a publikalt, a kirakat csatornajan allo
 * termekek azonositoi (a route meri). A `kategoriaMarkas` a route sorrendjeben
 * jon (legujabb elol); a sajat termek es a "helyette" elemei kiesnek belole.
 */
export function valasztas(input: {
  sajatId: string;
  explicit: readonly string[];
  kategoriaMarkas: readonly string[];
  megveheto: ReadonlySet<string>;
}): { helyette: string[]; hasonlo: string[] } {
  const helyette = input.explicit
    .filter((id) => id !== input.sajatId && input.megveheto.has(id))
    .slice(0, HELYETTE_HATAR);
  const marVan = new Set([input.sajatId, ...helyette]);
  const hasonlo = input.kategoriaMarkas
    .filter((id) => !marVan.has(id) && input.megveheto.has(id))
    .slice(0, HASONLO_HATAR);
  return { helyette, hasonlo };
}
