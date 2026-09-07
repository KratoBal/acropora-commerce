import { HttpTypes } from "@medusajs/types"
import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { sanitizeDescription } from "@lib/util/sanitize-description"
import ProductDescriptionTabs from "@modules/products/components/product-description-tabs"

type ProductInfoProps = {
  product: HttpTypes.StoreProduct
}

/**
 * The starter renders the description with {product.description} inside a
 * <Text>, which assumes the description is plain text whose line breaks carry
 * the structure. Our catalogue holds HTML: the customer was reading the markup
 * itself (measured on the running storefront, 54 escaped tag openings on one
 * product page).
 *
 * Two things follow from that, and both are load-bearing here:
 *
 * The markup is sanitised first -- the descriptions are edited by hand in the
 * old shop, so they are foreign HTML. The allowlist lives in
 * lib/util/sanitize-description and every entry in it was derived from a census
 * of the export, not guessed.
 *
 * It renders into a <div> and not a <Text>. <Text> emits a <p>, and a table or
 * a heading inside a <p> is invalid HTML that the browser silently unnests --
 * which would break the layout of the 189 products whose specifications are
 * tables.
 */
const ProductInfo = ({ product }: ProductInfoProps) => {
  const description = sanitizeDescription(product.description)

  return (
    <div id="product-info">
      <div className="flex flex-col gap-y-4 lg:max-w-[500px] mx-auto">
        {product.collection && (
          <LocalizedClientLink
            href={`/collections/${product.collection.handle}`}
            className="text-medium text-ui-fg-muted hover:text-ui-fg-subtle"
          >
            {product.collection.title}
          </LocalizedClientLink>
        )}
        <Heading
          level="h2"
          className="text-3xl leading-10 text-ui-fg-base"
          data-testid="product-title"
        >
          {product.title}
        </Heading>

        <ProductDescriptionTabs description={description} />
      </div>
    </div>
  )
}

export default ProductInfo
