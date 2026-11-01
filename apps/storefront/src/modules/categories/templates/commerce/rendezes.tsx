"use client"

import { useParams, usePathname, useRouter } from "next/navigation"

import { localeOf } from "@lib/i18n/locale"
import { translator } from "@lib/i18n/dictionary"
import { aktualisKeres } from "@lib/util/aktualis-keres"

import {
  SortOptions,
  sortOptionsFor,
} from "@modules/store/components/refinement-list/sort-products"

/**
 * A RENDEZES VALASZTOJA (117:71): feher doboz, keret, 16 px felirat es nyil.
 *
 * Az opciok es a feliratuk a bolt meglevo rendezesebol jonnek, nem a
 * keretbol: a keret "Ajánlott sorrend" felirata olyan valogatast igerne, ami
 * nincs. Rendezes-valtaskor a lap az elso oldalra ugrik, kulonben a mar
 * lapozott allas egy masik sorrend kozepen nyilna ki.
 */
export default function CommerceRendezes({ sortBy }: { sortBy: SortOptions }) {
  const router = useRouter()
  const pathname = usePathname()
  // the language is the path's (`/hu/...`, `/en-hu/...`): the label follows it
  const t = translator(localeOf(String(useParams().countryCode ?? "hu")))

  const valtas = (ertek: string) => {
    // FE-7: a cimet itt olvassuk, nem `useSearchParams`-szal (`aktualis-keres.ts`).
    const params = aktualisKeres()
    params.set("sortBy", ertek)
    params.delete("page")
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  return (
    <label className="relative flex h-[50px] items-center border border-acr-slate bg-acr-white">
      <span className="sr-only">{t("sort.title")}</span>
      <select
        value={sortBy}
        onChange={(event) => valtas(event.target.value)}
        className="h-full appearance-none bg-transparent pl-[14px] pr-[40px] text-[16px] leading-[26px] text-acr-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:[outline-color:var(--acr-color-heritage)]"
        data-testid="commerce-rendezes"
      >
        {sortOptionsFor(t).map((opcio) => (
          <option key={opcio.value} value={opcio.value}>
            {opcio.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none absolute right-[14px] text-[16px] text-acr-slate"
        aria-hidden="true"
      >
        ⌄
      </span>
    </label>
  )
}
