import { HttpTypes } from "@medusajs/types"
import { Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { sanitizeDescription } from "@lib/util/sanitize-description"

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

        {description && (
          // Tailwind's preflight strips the browser's default margins and list
          // markers, so markup coming from outside the app renders as one flat
          // run of text unless the container hands the styles back. These are
          // scoped to this block on purpose: they must not leak into the rest
          // of the page.
          <div
            className={[
              "text-medium text-ui-fg-subtle",
              "[&_p]:mb-3 [&_p:last-child]:mb-0",
              "[&_h1]:text-xl [&_h2]:text-lg [&_h3]:text-base [&_h4]:text-base",
              "[&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_h4]:font-semibold",
              "[&_h1]:mt-4 [&_h2]:mt-4 [&_h3]:mt-3 [&_h4]:mt-3",
              "[&_h1]:mb-2 [&_h2]:mb-2 [&_h3]:mb-1 [&_h4]:mb-1",
              "[&_ul]:list-disc [&_ol]:list-decimal [&_ul]:pl-5 [&_ol]:pl-5",
              "[&_ul]:mb-3 [&_ol]:mb-3 [&_li]:mb-1",
              "[&_strong]:font-semibold [&_b]:font-semibold [&_em]:italic",
              "[&_a]:underline [&_a]:text-ui-fg-base",
              "[&_hr]:my-4 [&_hr]:border-ui-border-base",
              // The specification tables are the reason the table tags are on
              // the allowlist; on a phone they have to be able to scroll rather
              // than push the page sideways.
              "[&_table]:w-full [&_table]:my-3 [&_table]:block [&_table]:overflow-x-auto",
              "[&_td]:align-top [&_td]:py-1 [&_td]:pr-3 [&_th]:py-1 [&_th]:pr-3 [&_th]:text-left",
              "[&_img]:max-w-full [&_img]:h-auto",
              "[&_iframe]:max-w-full",
            ].join(" ")}
            data-testid="product-description"
            dangerouslySetInnerHTML={{ __html: description }}
          />
        )}
      </div>
    </div>
  )
}

export default ProductInfo
