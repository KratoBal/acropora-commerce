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
    all: "Összes",
    productCount: "{count} termék",
    productCountOne: "{count} termék",
    filter: "Szűrés",
    clearFilter: "Törlés",
    searchLabel: "Keresés termék vagy márka alapján",
    searchPlaceholder: "Keresés termék vagy márka alapján…",
    categoryHeading: "Kategória",
    brandHeading: "Márka",
    moreBrands: "További {count} márka",
    activeFilters: "Aktív szűrők:",
    removeBrandFilter: "{name} szűrő levétele",
    unknownBrand: "Ismeretlen márka",
    brandFallback: "Márka",
    products: "Termékek",
    empty: "Ebben a kategóriában még nincs megjeleníthető termék.",
    position: "{from} / {count} termék",
    positionOne: "{from} / {count} termék",
    loadMore: "További termékek betöltése",
    details: "Részletek",
  },
  sort: {
    title: "Rendezés",
    newest: "Legújabbak",
    priceAsc: "Ár szerint növekvő",
    priceDesc: "Ár szerint csökkenő",
  },
  stock: {
    outOfStock: "Nincs raktáron",
    inStockCount: "Raktáron – {count} db",
    orderable: "Rendelhető",
  },
  cart: {
    add: "Kosárba",
    adding: "Kosárba teszem…",
    added: "Kosárba került",
    failed: "Nem sikerült, próbáld újra",
    addAria: "{name} kosárba",
  },
} as const
