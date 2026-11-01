import type { Dictionary } from "./index"

/** The English dictionary. The type makes a missing or an extra key a compile error (the shape is the Hungarian one). */
export const en: Dictionary = {
  category: {
    breadcrumbLabel: "Breadcrumb",
    subcategories: "Subcategories",
    products: "Products",
    liveAnimal: "Live animals",
    aboutCategory: "About this category",
    soldOut: "SOLD",
    available: "Available",
    outOfStock: "Out of stock",
    addToCart: "Add to cart",
    findSimilar: "Find a similar one",
    moreItems: "{count} more items",
    empty: "There are no products to show in this category yet.",
    helper: {
      technical: {
        eyebrow: "HELP CHOOSING",
        title: "Sizing helper",
        description: "Find the equipment that fits your aquarium.",
      },
      livestock: {
        eyebrow: "LIVE ANIMALS",
        title: "Pick-up in person",
        description: "We hand over live animals only in person, in our shop.",
      },
    },
  },
}
