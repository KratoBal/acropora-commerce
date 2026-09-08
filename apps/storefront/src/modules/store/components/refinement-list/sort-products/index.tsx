"use client"

import FilterRadioGroup from "@modules/common/components/filter-radio-group"

export type SortOptions = "price_asc" | "price_desc" | "created_at"

type SortProductsProps = {
  sortBy: SortOptions
  setQueryParams: (name: string, value: string) => void
  "data-testid"?: string
}

/**
 * A LISTA-NEZETEK VEZERLOI MAGYARUL (64c8452a, picasso atnezese 2026-09-08).
 *
 * === MI VOLT A LELET ===
 *
 * A store lap fejlece VEGIG angolul allt ("All products", "Sort by", "Latest
 * Arrivals", "Price: Low -> High"), mikozben a termeklapokon szinte minden
 * magyar. Picasso indoka, amiert nem tartotta szandekosnak: ugyanaz a mintazat,
 * mint a "Select Kivitel" a termeklapon -- a LISTA-nezetek maradtak le a
 * forditasbol, nem a termeklapok kaptak kulon kezelest.
 *
 * === A HATOKOR, MERVE, KET FUGGETLEN SZUROVEL ===
 *
 * A `store`, `categories`, `collections` es a lista-kartya (`product-preview`)
 * fajaban HAT angol, felhasznaloi szovegnek latszo literal allt. Ketto
 * kulonbozo szuro (egy kulcsszavas es egy tagabb, "legalabb ket szo, nagybetuvel
 * kezdodik") UGYANAZT a hatot adta -- ez keresztellenorzes, nem ismetles.
 *
 * A hatbol OT megy at magyarra. A hatodik NEM felhasznaloi szoveg: egy
 * `console.error` az `options-picker`-ben, ami fejlesztonek szol, es a lapunk
 * szabalya szerint a kod es a naplo ANGOL marad. Ez a kulonbseg nem
 * szormeszalhasogatas: egy naplo-uzenet forditasa a hibakeresest neheziti, es
 * senki nem latja a vevo oldalan.
 *
 * === A NYIL ELTUNIK, ES EZ NEM STILUS ===
 *
 * Az angol alak `->` nyilat hasznalt ("Price: Low -> High"). A magyar
 * megfelelo a rendezes IRANYAT nevezi meg ("novekvo" / "csokkeno"), tehat a
 * nyil nem hianyzik belole -- egy "Ár: alacsony -> magas" alak a szo szerinti
 * forditas lenne, nem a magyar felirat.
 */
/** A vezerlo cime. Konstans, hogy allitas mutathasson ra. */
export const RENDEZES_CIM = "Rendezés"

export const sortOptions = [
  {
    value: "created_at",
    label: "Legújabbak",
  },
  {
    value: "price_asc",
    label: "Ár szerint növekvő",
  },
  {
    value: "price_desc",
    label: "Ár szerint csökkenő",
  },
]

const SortProducts = ({
  "data-testid": dataTestId,
  sortBy,
  setQueryParams,
}: SortProductsProps) => {
  const handleChange = (value: string) => {
    setQueryParams("sortBy", value as SortOptions)
  }

  return (
    <FilterRadioGroup
      title={RENDEZES_CIM}
      items={sortOptions}
      value={sortBy}
      handleChange={handleChange}
      data-testid={dataTestId}
    />
  )
}

export default SortProducts
