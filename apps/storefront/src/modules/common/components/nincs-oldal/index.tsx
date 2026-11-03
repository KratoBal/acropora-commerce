"use client"

import { ArrowUpRightMini } from "@medusajs/icons"
import Link from "next/link"
import { useParams, usePathname } from "next/navigation"

import { translator } from "@lib/i18n/dictionary"
import { localeOf, parseSegment } from "@lib/i18n/locale"
import { Text } from "@modules/common/components/ui"

/**
 * THE "NO SUCH PAGE" BODY (the four `not-found.tsx` files), in the page's language.
 *
 * Next hands a `not-found` file no route params, so the language is read on the client: the `countryCode` route param inside the
 * `[countryCode]` routes, and the first path segment where there is no param (the root `app/not-found.tsx`, for a path that
 * matched no route at all). An unknown first segment is Hungarian, as everywhere else (`localeOf`). The link goes to the home page
 * of the same language: `/en-hu` on an English path, `/` otherwise. The tab title and description of these pages are the static
 * `metadata` of the files (a `not-found` file cannot read the path there); they stay language-neutral ("404") and Hungarian.
 *
 * `cart` is the sentence of the missing-cart page (a cart that is gone), the same frame.
 */
export default function NincsOldal({ kosar = false }: { kosar?: boolean }) {
  const params = useParams()
  const pathname = usePathname()
  const countryCode =
    typeof params?.countryCode === "string" ? params.countryCode : null
  const segment = countryCode ?? (pathname ?? "").split("/")[1] ?? ""
  const t = translator(localeOf(segment))
  // the home link of the same language: inside `[countryCode]` the segment is a real one; at the root only an English one is trusted
  const home =
    countryCode || parseSegment(segment).locale !== "hu" ? `/${segment}` : "/"

  return (
    <div
      className={
        "flex flex-col items-center justify-center min-h-[calc(100vh-64px)]" +
        (kosar ? "" : " gap-4")
      }
      data-testid="nincs-oldal"
    >
      <h1 className="text-2xl-semi text-ui-fg-base">{t("notFound.title")}</h1>
      <p className="text-small-regular text-ui-fg-base">
        {t(kosar ? "notFound.cartText" : "notFound.text")}
      </p>
      <Link className="flex gap-x-1 items-center group" href={home}>
        <Text className="text-ui-fg-interactive">{t("notFound.back")}</Text>
        <ArrowUpRightMini
          className="group-hover:rotate-45 ease-in-out duration-150"
          color="var(--fg-interactive)"
        />
      </Link>
    </div>
  )
}
