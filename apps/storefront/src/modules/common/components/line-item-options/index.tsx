import { HttpTypes } from "@medusajs/types"
import { valtozatNev } from "@modules/cart/components/item/valtozat"
import { Text } from "@modules/common/components/ui"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  /** a termek neve: a vele azonos valtozatnev nem valtozat (`valtozatNev`) */
  termekNev?: string | null
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

/**
 * A VALTOZAT NEVE A RENDELES-VISSZAIGAZOLAS ES A KOSAR-LEGORDULO SORAIBAN (acrobot 49654): a kosarsorral AZONOS szabaly
 * (`valtozatNev`): az alapertelmezett `Default` es a termekneves masolat nem valtozat, ilyenkor nem all semmi a sorban;
 * a valodi valtozatnev (meret, kiszereles) elotag nelkul all. Az angol "Variant: " elotag a magyar sorban nem allhat.
 */
const LineItemOptions = ({
  variant,
  termekNev,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  const nev = valtozatNev(variant?.title, termekNev)
  if (!nev) return null

  return (
    <Text
      data-testid={dataTestid}
      data-value={dataValue}
      className="inline-block txt-medium text-ui-fg-subtle w-full overflow-hidden text-ellipsis"
    >
      {nev}
    </Text>
  )
}

export default LineItemOptions
