import type { Dictionary } from "./index"

/** The English dictionary. The type makes a missing or an extra key a compile error (the shape is the Hungarian one). */
export const en: Dictionary = {
  category: {
    breadcrumbLabel: "Breadcrumb",
    subcategories: "Subcategories",
    all: "All",
    productCount: "{count} products",
    productCountOne: "{count} product",
    filter: "Filter",
    clearFilter: "Clear",
    searchLabel: "Search by product or brand",
    searchPlaceholder: "Search by product or brand…",
    categoryHeading: "Category",
    brandHeading: "Brand",
    moreBrands: "{count} more brands",
    activeFilters: "Active filters:",
    removeBrandFilter: "Remove the {name} filter",
    unknownBrand: "Unknown brand",
    brandFallback: "Brand",
    products: "Products",
    empty: "There are no products to show in this category yet.",
    position: "{from} of {count} products",
    positionOne: "{from} of {count} product",
    loadMore: "Load more products",
    details: "Details",
  },
  sort: {
    title: "Sort",
    newest: "Newest",
    priceAsc: "Price: low to high",
    priceDesc: "Price: high to low",
  },
  stock: {
    outOfStock: "Out of stock",
    inStockCount: "In stock – {count} pcs",
    orderable: "Available to order",
  },
  cart: {
    add: "Add to cart",
    adding: "Adding to cart…",
    added: "Added to cart",
    failed: "That did not work, try again",
    addAria: "Add {name} to cart",
  },
}
