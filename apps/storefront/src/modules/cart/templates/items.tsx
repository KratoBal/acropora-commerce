import repeat from "@lib/util/repeat"
import { HttpTypes } from "@medusajs/types"
import { Heading, Table } from "@modules/common/components/ui"

import Item from "@modules/cart/components/item"
import StepIndicator from "@modules/cart/components/step-indicator"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SkeletonLineItem from "@modules/skeletons/components/skeleton-line-item"

type ItemsTemplateProps = {
  cart?: HttpTypes.StoreCart
}

const ItemsTemplate = ({ cart }: ItemsTemplateProps) => {
  const items = cart?.items
  return (
    <div>
      <div className="pb-3">
        <StepIndicator active={0} />
      </div>
      <div className="pb-3 flex items-center">
        {/*
          A TERV FEJLECE, MAGYARUL. A tetelszam a terv sajat alakja
          ("4 TETEL"), es valodi adatbol jon -- nem diszites.
        */}
        <Heading className="text-[2rem] leading-[2.75rem]">Kosár</Heading>
        {items?.length ? (
          <span
            className="ml-3 text-[11px] font-semibold uppercase tracking-wide"
            style={{ color: "var(--terv-szoveg-halvany)" }}
            data-testid="cart-item-count"
          >
            {items.length} tétel
          </span>
        ) : null}
      </div>
      <Table>
        <Table.Header className="border-t-0">
          <Table.Row className="text-ui-fg-subtle txt-medium-plus">
            <Table.HeaderCell className="!pl-0">Termék</Table.HeaderCell>
            <Table.HeaderCell></Table.HeaderCell>
            <Table.HeaderCell>Mennyiség</Table.HeaderCell>
            <Table.HeaderCell className="hidden small:table-cell">
              Egységár
            </Table.HeaderCell>
            <Table.HeaderCell className="!pr-0 text-right">
              Sorösszeg
            </Table.HeaderCell>
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {items
            ? items
                .sort((a, b) => {
                  return (a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1
                })
                .map((item) => {
                  return (
                    <Item
                      key={item.id}
                      item={item}
                      currencyCode={cart?.currency_code}
                    />
                  )
                })
            : repeat(5).map((i) => {
                return <SkeletonLineItem key={i} />
              })}
        </Table.Body>
      </Table>
      {/*
        A TERV KET ZARO SORA. A visszavivo hivatkozas azert kell, mert egy
        kosar, amibol csak elore lehet menni, zsakutca; az afa-mondat pedig a
        terv sajat szovege, es a vevo szamara az arak ertelmezese.
      */}
      <div className="pt-6 flex flex-col gap-2">
        <LocalizedClientLink
          href="/store"
          className="w-fit text-sm underline"
          style={{ color: "var(--terv-kiemel)" }}
          data-testid="continue-shopping-link"
        >
          Vásárlás folytatása
        </LocalizedClientLink>
        <span
          className="text-[11px]"
          style={{ color: "var(--terv-szoveg-halvany)" }}
        >
          Az árak bruttó árak, 27% áfával.
        </span>
      </div>
    </div>
  )
}

export default ItemsTemplate
