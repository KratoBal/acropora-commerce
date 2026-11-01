/**
 * THE HUNGARIAN DICTIONARY: the SOURCE of the keys. `en.ts` has the same shape, and a missing English key is a type error.
 *
 * One group per page or part. A text with a number or a name in it carries `{placeholders}`, filled by `t(key, { name: value })`.
 * Words that are not text for a person (a `data-testid`, a class, a handle) do not belong here.
 */
export const hu = {
  category: {
    breadcrumbLabel: "Morzsamenü",
    subcategories: "Alkategóriák",
    products: "Termékek",
    liveAnimal: "Élő állat",
    aboutCategory: "A kategóriáról",
    soldOut: "ELKELT",
    available: "Elérhető",
    outOfStock: "Nincs raktáron",
    addToCart: "Kosárba",
    findSimilar: "Hasonlót keresek",
    moreItems: "További {count} tétel",
    empty: "Ebben a kategóriában még nincs megjeleníthető termék.",
    helper: {
      technical: {
        eyebrow: "SEGÍTSÉG A VÁLASZTÁSHOZ",
        title: "Méretezés-segéd",
        description: "Találd meg az akváriumodhoz illő felszerelést.",
      },
      livestock: {
        eyebrow: "ÉLŐ ÁLLAT",
        title: "Személyes átvétel",
        description: "Élő állatot csak személyesen, üzletünkben adunk át neked.",
      },
    },
  },
} as const
