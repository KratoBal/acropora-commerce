/**
 * A "NINCS TALALAT" LAP ADATAI (P2, 4b, a 253:57 szerint). Tiszta fuggvenyek;
 * a lekeres a lapon van.
 */
import type { FejlecMenuPont } from "./fejlec-menu-pontok"

/**
 * A KERESESI TIPPEK (253:81), a keret szavai. Kuralt szavak, ezert MERVE
 * allnak itt: 2026-09-29-en a stage kereso vegpontjan mind az ot talal
 * (ReefLED 1, Acropora 69, Bohóchal 17, KH teszt 58, MP40 4). Ha egy
 * valaha nullat ad, a tipp a "nincs talalat" lapra vinne vissza: akkor ki
 * kell venni, nem atirni.
 */
export const KERESES_TIPPEK = [
  "ReefLED",
  "Acropora",
  "Bohóchal",
  "KH teszt",
  "MP40",
] as const

type Kategoria = {
  id: string
  handle?: string | null
  category_children?: readonly Kategoria[] | null
}

export type KategoriaKartya = {
  felirat: string
  handle: string
  /** A kategoria azonositoja, a termekszamhoz. */
  id: string
}

/**
 * A KATEGORIA-KARTYAK (253:95) a fejlec menujebol: pontosan azok a pontok,
 * amelyeknek a boltban van oldala, a menu sorrendjeben. A "Hamarosan" pontok
 * kimaradnak: egy kartya, ami egy meg nem letezo oldalra visz, nem segit
 * annak, aki eppen nem talalt semmit.
 */
export function kategoriaKartyak<T extends Kategoria>(
  pontok: readonly FejlecMenuPont<T>[],
  gyokerek: readonly T[],
): KategoriaKartya[] {
  const alkategoriak = gyokerek.flatMap((gy) => [
    ...(gy.category_children ?? []),
  ])
  return pontok.flatMap((pont): KategoriaKartya[] => {
    if (pont.tipus === "gyoker" && pont.kategoria.handle) {
      return [
        {
          felirat: pont.felirat,
          handle: pont.kategoria.handle,
          id: pont.kategoria.id,
        },
      ]
    }
    if (pont.tipus === "oldal") {
      const alkategoria = alkategoriak.find((k) => k.handle === pont.handle)
      return alkategoria
        ? [{ felirat: pont.felirat, handle: pont.handle, id: alkategoria.id }]
        : []
    }
    return []
  })
}
