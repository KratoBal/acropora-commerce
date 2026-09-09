import { HttpTypes } from "@medusajs/types"

/**
 * A GYOKEREK, KET SZINT GYEREKKEL -- KULON, TISZTA FUGGVENYKENT.
 *
 * MIERT NEM A HIVO BELSEJEBEN: ott halozati hivasok kozott ulne (`listCategories`,
 * `listProducts`), es semmilyen teszt nem latna. Igy viszont egy sima tomb megy
 * be es egy sima tomb jon ki, tehat MERHETO -- ugyanaz a lepes, amit a lapunk
 * ugy nevez, hogy ha a hely nem merheto, a KODOT kell elmozditani.
 */
export const gyokerekKetSzintel = (
  mind: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] => {
  const szuloje = (c: HttpTypes.StoreProductCategory) =>
    (c as { parent_category_id?: string | null }).parent_category_id

  const kozvetlenGyerekei = (id: string) =>
    mind.filter((c) => szuloje(c) === id)

  return mind
    .filter((c) => !szuloje(c))
    .map((gy) => ({
      ...gy,
      category_children: kozvetlenGyerekei(gy.id).map((k) => ({
        ...k,
        category_children: kozvetlenGyerekei(k.id),
      })),
    })) as HttpTypes.StoreProductCategory[]
}
