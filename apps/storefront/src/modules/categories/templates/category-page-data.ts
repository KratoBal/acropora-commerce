import { ELO_ALLAT_GYOKEREK } from "@modules/products/components/lap-vaz/vilag-valto"
import {
  type AcroporaMod,
  modKategoriaUtvonalhoz,
} from "@lib/util/acropora-mod"

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

/**
 * A kategorialap MODJA a P1a szabalya szerint (`acropora-mod.ts`): a gyokertol
 * a lapig tarto nevsor dont. A lap ezt `data-acr-mod` jelolokent teszi ki, es
 * ma CSAK a fejlec olvassa (P1b): a lap torzse a P2-ig valtozatlan.
 */
export function categoryPageMode(category: CategoryPathItem): AcroporaMod {
  const nevek: (string | null | undefined)[] = []
  let current: CategoryPathItem | null | undefined = category
  while (current) {
    nevek.unshift(current.name)
    current = current.parent_category
  }
  return modKategoriaUtvonalhoz(nevek)
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
