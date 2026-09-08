import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Category = Pick<
  HttpTypes.StoreProductCategory,
  "id" | "name" | "handle" | "parent_category_id"
>

export default function ProductBreadcrumb({
  product,
  categories,
}: {
  product: HttpTypes.StoreProduct
  categories: Category[]
}) {
  const byId = new Map(categories.map((category) => [category.id, category]))
  const ancestry = (category: Category) => {
    const path: Category[] = []
    const seen = new Set<string>()
    let current: Category | undefined = category
    while (current && !seen.has(current.id)) {
      seen.add(current.id)
      path.unshift(current)
      current = current.parent_category_id
        ? byId.get(current.parent_category_id)
        : undefined
    }
    return path
  }
  const path = (product.categories ?? []).reduce<Category[]>(
    (deepest, category) => {
      const local = byId.get(category.id)
      const candidate = local ? ancestry(local) : []
      return candidate.length > deepest.length ? candidate : deepest
    },
    [],
  )

  return (
    <nav aria-label="Morzsamenü" className="overflow-x-auto whitespace-nowrap">
      <ol className="flex min-w-max items-center gap-2 text-sm text-ui-fg-muted">
        <li>
          <LocalizedClientLink
            className="hover:text-ui-fg-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            href="/"
          >
            Főoldal
          </LocalizedClientLink>
        </li>
        {path.map((category) => (
          <li key={category.id} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <LocalizedClientLink
              className="hover:text-ui-fg-base focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
              href={`/categories/${category.handle}`}
            >
              {category.name.trim()}
            </LocalizedClientLink>
          </li>
        ))}
        <li
          className="flex min-w-0 items-center gap-2 text-ui-fg-base"
          aria-current="page"
        >
          <span aria-hidden="true">/</span>
          <span className="max-w-48 truncate">{product.title}</span>
        </li>
      </ol>
    </nav>
  )
}
