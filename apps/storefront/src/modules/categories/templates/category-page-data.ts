import { ELO_ALLAT_GYOKEREK } from "@modules/products/components/lap-vaz/vilag-valto"

export type CategoryPageKind = "technical" | "livestock"

type CategoryPathItem = {
  name?: string | null
  parent_category?: CategoryPathItem | null
}

/**
 * The catalogue's three livestock roots are already the source of truth for
 * the product-page world. Category pages use the same classification, rather
 * than a second, visually similar list of category names.
 */
export function categoryPageKind(category: CategoryPathItem): CategoryPageKind {
  let current: CategoryPathItem | null | undefined = category

  while (current) {
    if (
      current.name &&
      (ELO_ALLAT_GYOKEREK as readonly string[]).includes(current.name)
    ) {
      return "livestock"
    }
    current = current.parent_category
  }

  return "technical"
}

export const helperCopyFor = (kind: CategoryPageKind) =>
  kind === "technical"
    ? {
        eyebrow: "SEGÍTSÉG A VÁLASZTÁSHOZ",
        title: "Méretezés-segéd",
        description: "Találd meg az akváriumodhoz illő felszerelést.",
      }
    : {
        eyebrow: "ÉLŐ ÁLLAT",
        title: "Személyes átvétel",
        description:
          "Élő állatot csak személyesen, üzletünkben adunk át neked.",
      }
