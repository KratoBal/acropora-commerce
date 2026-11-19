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

export type Kategoria = {
  id: string;
  name: string;
  handle: string;
  parent_category_id?: string | null;
  is_active?: boolean | null;
  is_internal?: boolean | null;
};

/** A buyer may see it: active and not internal (what the Store API hands the storefront; barracuda, #834). */
const lathato = (k: Kategoria) => k.is_active !== false && k.is_internal !== true;

/**
 * Az elsodleges kategoria: a vetites altal kiirt `primary_category_id`, ha a
 * termek kategoriai kozott van.
 *
 * HA NINCS, A LEGMELYEBB SAJAT KATEGORIA (A6 meres, 2026-11-19: a teszten mind a 11 helyettesito nelkuli kifutott
 * termeknel ures volt a jelzo, mert a vetito csak az Acropora-fan allo termekre irja ki, a kifutottak pedig UNAS-
 * gazdajuak; igy a "Vissza a kategoriahoz" link es a gepi hasonlo termek sehol nem jelent meg). A sorrendre most
 * sem tippelunk (a Medusa listaja nem rendezett): a termek kategoriai kozul az a lanc nyer, amelyik a sajat
 * kategoriain belul a leghosszabb (a kirakat `besorolasUt` szabalya), egyenlosegnel a handle ABC-rendje dont, tehat
 * ugyanarra a termekre mindig ugyanaz. Csak a vevonek lathato (aktiv, nem belso) kategoria szamit, a primary is.
 */
export function elsodlegesKategoria(
  metadata: Record<string, unknown> | null | undefined,
  kategoriak: readonly Kategoria[] | null | undefined,
): Kategoria | null {
  // only a category the buyer can open: a hidden one is a dead "Vissza a kategóriához" link and a hidden pool of
  // similar products (barracuda, #834); the primary is held to the same rule
  const lista = (kategoriak ?? []).filter(lathato);
  const id = metadata?.[ELSODLEGES_KATEGORIA_KULCS];
  const jelolt =
    typeof id === "string" && id ? lista.find((k) => k.id === id) : undefined;
  if (jelolt) return jelolt;
  return legmelyebbKategoria(lista);
}

function legmelyebbKategoria(kategoriak: readonly Kategoria[]): Kategoria | null {
  const sajat = new Map(kategoriak.map((k) => [k.id, k]));
  const melyseg = (k: Kategoria) => {
    let n = 1;
    const latott = new Set([k.id]);
    let szulo = k.parent_category_id ? sajat.get(k.parent_category_id) : undefined;
    while (szulo && !latott.has(szulo.id)) {
      latott.add(szulo.id);
      n += 1;
      szulo = szulo.parent_category_id ? sajat.get(szulo.parent_category_id) : undefined;
    }
    return n;
  };
  let legjobb: { k: Kategoria; m: number } | null = null;
  for (const k of kategoriak) {
    const m = melyseg(k);
    if (
      !legjobb ||
      m > legjobb.m ||
      (m === legjobb.m && k.handle.localeCompare(legjobb.k.handle) < 0)
    )
      legjobb = { k, m };
  }
  return legjobb?.k ?? null;
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
