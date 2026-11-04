import { listProducts } from "@lib/data/products"
import type { NemKaphatoTermek } from "@lib/data/nem-kaphato"
import { getRegion } from "@lib/data/regions"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Product from "@modules/products/components/product-preview"
import { kertSorrendben } from "@modules/products/components/related-products/gondozott-kapcsolatok"
import { HttpTypes } from "@medusajs/types"

/**
 * A NEM KAPHATO (KIFUTOTT) TERMEK LAPJA (V4.2, kartya 9d0523fa).
 *
 * A 404 helyett all, ha a hatter a handle-re kifutott termeket ad
 * (`/store/nem-kaphato/:handle`). Korall szovegei (v-feluleti-szovegek.md),
 * acrobot dontesevel (42186): a UNAS-ban kezzel megadott hasonlo kapcsolat
 * "Ezeket talaltuk helyette", a gepi kategoria+marka jelolt KULON szakasz, mert
 * azt senki nem hagyta jova helyettesitokent; ha nincs kezzel megadott
 * kapcsolat, a "nem talalunk kozvetlen helyettesitot" mondat all.
 *
 * Megvenni itt nem lehet: a lap nem ad kosar-gombot, es a termek nincs a
 * kirakat csatornajan. A ket lista csak megveheto termeket hordoz (a hatter
 * szuri), es a kartyak a mai termeklista-uton jonnek (ar, kep).
 */
export default async function NemKaphatoLap({
  adat,
  countryCode,
}: {
  adat: NemKaphatoTermek
  countryCode: string
}) {
  const locale = localeOf(countryCode)
  const t = translator(locale)
  const region = await getRegion(countryCode)
  const azonositok = [...adat.helyette, ...adat.hasonlo]
  const termekek: HttpTypes.StoreProduct[] =
    region && azonositok.length
      ? await listProducts({
          countryCode,
          queryParams: { id: azonositok, limit: azonositok.length },
        }).then(({ response }) => response.products)
      : []
  const helyette = kertSorrendben(termekek, adat.helyette)
  const hasonlo = kertSorrendben(termekek, adat.hasonlo)
  const kategoria = adat.termek.kategoria

  const racs = (lista: HttpTypes.StoreProduct[]) => (
    <ul className="grid grid-cols-2 gap-x-6 gap-y-8 small:grid-cols-3 medium:grid-cols-4">
      {lista.map((p) => (
        <li key={p.id}>
          {region ? (
            <Product region={region} product={p} locale={locale} />
          ) : null}
        </li>
      ))}
    </ul>
  )

  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="nem-kaphato-lap">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-8 px-4 pb-16 pt-[18px] small:px-[56px] small:pt-[34px]">
        <div className="flex flex-col gap-3">
          <h1
            className="text-[26px] font-semibold leading-[34px] text-acr-ink small:text-[38px] small:leading-[50px]"
            data-testid="nem-kaphato-cim"
          >
            {t("discontinued.title")}
          </h1>
          <p className="text-[15px] leading-[22px] text-acr-slate">
            {t("discontinued.intro", { name: adat.termek.title })}
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2 text-[14px] leading-[20px]">
            {kategoria ? (
              <LocalizedClientLink
                href={`/categories/${kategoria.handle}`}
                className="text-acr-heritage underline"
                data-testid="nem-kaphato-kategoria"
              >
                {t("discontinued.backToCategory", { name: kategoria.name })}
              </LocalizedClientLink>
            ) : null}
            <LocalizedClientLink
              href="/store"
              className="text-acr-heritage underline"
              data-testid="nem-kaphato-kereses"
            >
              {t("discontinued.search")}
            </LocalizedClientLink>
          </div>
        </div>

        {helyette.length ? (
          <section
            aria-labelledby="nem-kaphato-helyette"
            data-testid="nem-kaphato-helyette"
          >
            <h2
              id="nem-kaphato-helyette"
              className="mb-6 text-xl-semi text-ui-fg-base"
            >
              {t("discontinued.replacementsTitle")}
            </h2>
            {racs(helyette)}
          </section>
        ) : (
          <p
            className="text-base-regular text-gray-600"
            data-testid="nem-kaphato-nincs"
          >
            {t("discontinued.none")}
          </p>
        )}

        {hasonlo.length ? (
          <section
            aria-labelledby="nem-kaphato-hasonlo"
            data-testid="nem-kaphato-hasonlo"
          >
            <h2
              id="nem-kaphato-hasonlo"
              className="mb-6 text-xl-semi text-ui-fg-base"
            >
              {t("discontinued.similarTitle")}
            </h2>
            {racs(hasonlo)}
          </section>
        ) : null}
      </div>
    </div>
  )
}
