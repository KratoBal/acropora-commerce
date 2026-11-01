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
  header: {
    account: "Fiókom",
    mainMenu: "Fő menü",
    mobile: {
      openMenu: "Menü megnyitása",
      closeMenu: "Menü bezárása",
      search: "Keresés",
      account: "Fiók",
    },
    cart: {
      label: "Kosár",
      aria: "Kosár · {count}",
    },
  },
  nav: {
    knowledge: "Tudástár",
    services: "Szolgáltatások",
    myAquariums: "Akváriumaim",
  },
  cartMenu: {
    title: "Kosár",
    quantity: "Mennyiség: {count}",
    remove: "Eltávolítás",
    subtotal: "Részösszeg",
    subtotalNote: "(adók nélkül)",
    goToCart: "Ugrás a kosárhoz",
    empty: "A kosarad üres.",
    allProducts: "Ugrás az összes termékhez",
    discover: "Termékek felfedezése",
  },
  /**
   * THE HEADER TEXTS THE SHOP OWNER CAN EDIT IN THE OS (the catalogue `fejlec.*` defaults in `modules/kezdolap/szovegek.ts`). The English
   * shop shows the English text only while the OS still holds this exact Hungarian default; an OS text that was changed is shown as
   * written (the editor has no per-language fields yet). `dictionary.spec.ts` keeps this group equal to the catalogue defaults.
   */
  headerText: {
    bar1: "Élőállat kizárólag személyes átvétellel, a budapesti boltban",
    bar2: "Technika és vegyszer: házhozszállítás 2–3 munkanap alatt",
    bar3: "Nyitva ma 10–19 óráig",
    bar4: "Tanácsadás: +36 1 234 5678",
    search: "Keresés: korall, tengeri só, LED-lámpa…",
    menuLive: "Élőállat",
    menuTech: "Technika",
    menuChem: "Vegyszer és fogyóanyag",
    menuServices: "Szolgáltatások",
    menuShop: "A boltunk",
    allCategories: "Összes kategória →",
    liveCardTitle: "Jó tudni",
    liveCardText:
      "Az élőállatot csak személyesen, a budapesti boltban adjuk át.",
    techCardTitle: "Nem tudod, melyik lámpa kell?",
    techCardText: "Medencemérethez és korallokhoz ajánlunk.",
    techCardLink: "Kérj tanácsot →",
    chemCardTitle: "Laboratóriumi vízmérés",
    chemCardText: "Hozd be a mintát a boltba.",
    chemCardLink: "Részletek →",
  },
  /**
   * THE FOOTER LABELS: the built-in ones (`hivatkozasok.ts`) and the same words as the OS stores them in its saved footer (the OS editor
   * writes the Hungarian defaults back, so the English shop looks a saved label up here before showing it as written).
   */
  footerText: {
    colSitemap: "Oldaltérkép",
    colAccount: "Vásárlói fiók",
    colInfo: "Információk",
    home: "Nyitóoldal",
    products: "Termékek",
    brands: "Forgalmazott márkák",
    login: "Belépés",
    register: "Regisztráció",
    profile: "Profilom",
    cart: "Kosár",
    favourites: "Kedvenceim",
    contact: "Elérhetőségek",
    payment: "Fizetés",
    shipping: "Szállítás",
    illustratedInfo: "Képes vásárlói tájékoztató",
    legalTerms: "Általános szerződési feltételek",
    legalPrivacy: "Adatkezelési tájékoztató",
    legalImprint: "Impresszum",
    legalWithdrawal: "Tájékoztató az elállási jogról",
    legalWithdrawalForm: "Elállási nyilatkozat (minta)",
    legalWarranty: "Tájékoztató a szavatossági jogokról",
    legalCookies: "Süti tájékoztató",
  },
  footer: {
    openingHours: "Nyitvatartás:",
    rights: "© {year} {name}. Minden jog fenntartva.",
    paymentAlt:
      "Fizetési opciók: Google Pay, Apple Pay, Mastercard, Maestro, Visa",
  },
  newsletter: {
    title: "Hírlevél",
    text: "Iratkozz fel a hírlevelünkre és értesülj elsőként az újdonságokról, akciókról, ajánlatokról!",
    consent:
      "Hozzájárulok az adataim kezeléséhez és elfogadom az Adatkezelési tájékoztatót.",
    button: "Feliratkozás",
    policyLink: "Adatkezelési tájékoztató",
    consentLinkPattern: "adatkezelési tájékoztató[a-záéíóöőúüű]*",
    name: "Név",
    email: "E-mail",
    done: "Köszönjük, feliratkoztál a hírlevelünkre.",
    errorMissing: "Add meg a neved és az e-mail-címed.",
    errorEmail: "Az e-mail-cím formája nem jó.",
    errorConsent: "A feliratkozáshoz el kell fogadnod az adatkezelést.",
    errorLimit:
      "Túl sok feliratkozás érkezett innen. Próbáld újra pár perc múlva.",
    errorOff: "A hírlevél-feliratkozás most nem elérhető.",
    errorFailed: "A feliratkozás most nem sikerült. Próbáld újra később.",
  },
} as const
