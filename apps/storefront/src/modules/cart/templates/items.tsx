import repeat from "@lib/util/repeat"
import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import { HttpTypes } from "@medusajs/types"

import Item from "@modules/cart/components/item"
import StepIndicator from "@modules/cart/components/step-indicator"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
  /** the first path segment: `hu` (Hungarian) or `en-hu` (English) */
  countryCode: string
}

const ItemsTemplate = ({ cart, countryCode }: ItemsTemplateProps) => {
  const t = translator(localeOf(countryCode))
  const items = cart?.items

  return (
    <div>
      <div className="pb-4">
        <StepIndicator active={0} countryCode={countryCode} />
      </div>
      <div className="flex flex-wrap items-baseline gap-x-4 pb-4">
        {/*
          A TERV FEJLECE. A tetelszam a terv sajat alakja ("4 TETEL"), es
          valodi adatbol jon -- nem diszites. A lap egyetlen H1-e (axe
          `page-has-heading-one`).
        */}
        <h1 className="font-kiemelt text-[40px] font-normal leading-[44px] tracking-[-0.01em] text-acr-ink small:text-[58px] small:leading-[62px]">
          {t("cartPage.title")}
        </h1>
        {items?.length ? (
          <span
            className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate"
            data-testid="cart-item-count"
          >
            {t(
              items.length === 1
                ? "cartPage.itemCountOne"
                : "cartPage.itemCount",
              { count: items.length },
            )}
          </span>
        ) : null}
      </div>
      <table className="block w-full border-collapse small:table">
        <thead className="hidden small:table-header-group">
          <tr className="text-left text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate">
            <th className="pb-3 pr-4 font-medium">
              {t("cartPage.colProduct")}
            </th>
            {/* a felolvasonak nev kell az oszlopnak (axe `empty-table-header`) */}
            <th className="pb-3 pr-4 font-medium">
              <span className="sr-only">{t("cartPage.colName")}</span>
            </th>
            <th className="pb-3 pr-4 font-medium">
              {t("cartPage.colQuantity")}
            </th>
            <th className="hidden pb-3 pr-4 font-medium small:table-cell">
              {t("cartPage.colUnitPrice")}
            </th>
            <th className="pb-3 text-right font-medium">
              {t("cartPage.colLineTotal")}
            </th>
          </tr>
        </thead>
        <tbody className="block small:table-row-group">
          {items
            ? [...items]
                .sort((a, b) =>
                  (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1,
                )
                .map((item) => (
                  <Item
                    key={item.id}
                    item={item}
                    currencyCode={cart?.currency_code ?? ""}
                  />
                ))
            : repeat(5).map((i) => <SkeletonLineItem key={i} />)}
        </tbody>
      </table>
      {/*
        A TERV KET ZARO SORA. A visszavivo hivatkozas azert kell, mert egy
        kosar, amibol csak elore lehet menni, zsakutca; az afa-mondat pedig a
        terv sajat szovege, es a vevo szamara az arak ertelmezese.
      */}
      <div className="flex flex-col gap-2 border-t border-acr-line pt-6">
        <LocalizedClientLink
          href="/store"
          className="w-fit text-[14px] text-acr-ocean underline"
          data-testid="continue-shopping-link"
        >
          {t("cartPage.continueShopping")}
        </LocalizedClientLink>
        <span className="text-[12px] leading-[18px] text-acr-slate">
          {t("cartPage.vatNote")}
        </span>
      </div>
    </div>
  )
}

export default ItemsTemplate
