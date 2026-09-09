import { notFound } from "next/navigation"
import { Suspense } from "react"

import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { OptionValueIds } from "@lib/util/product-option-filters"
import CategoryProducts from "./category-products"
import { categoryPageKind, helperCopyFor } from "./category-page-data"
import { Breadcrumbs } from "./category-breadcrumbs"

const PRODUCT_LIMIT = 12

export default function CategoryTemplate({
  category,
  nevek,
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  category: HttpTypes.StoreProductCategory
  /**
   * A MEGJELENITENDO NEVEK, AZONOSITO SZERINT -- A LAPTOL, NEM ITT SZAMOLVA.
   *
   * A rovidites eddig FELTETEL NELKUL vagott. A betoltes utan az pont azt a
   * szulo-utotagot vinne el a 77 UTKOZO kategoriarol, amit a dontes
   * szandekosan megtart. Az egyedisegrol csak a teljes katalogus tud
   * dontenni, es az ennek a komponensnek nincs a kezeben: a sajat lancat es a
   * gyerekeit kapja.
   *
   * A TARTALEK A TELJES NEV, nem a rovid. Hianyzo terkepnel a rovid alakra
   * esni vissza azt jelentene, hogy a feltetel nelkuli vagas csendben
   * visszajon.
   */
  nevek?: Map<string, string>
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) {
  if (!category || !countryCode) notFound()

  const pageNumber = Math.max(Number.parseInt(page ?? "1", 10) || 1, 1)
  const children = category.category_children ?? []
  const kind = categoryPageKind(category)
  const helper = helperCopyFor(kind)

  /*
    A CIM ES A CSEMPEK IS A MEGJELENITENDO NEVET VISELIK.

    A lap NEGY helyen mutat kategoria-nevet: a sajat morzsamenujeben ketto (a
    felmenok es a jelenlegi), a H1-ben, es a gyermek-csempeken. Mind a negy
    UGYANABBOL a terkepbol dolgozik -- kulonben a lapon BELUL allna elteres,
    ami rosszabb, mint a lapok kozotti.

    ITT KORABBAN A LANC SAJAT LEVEZETESE ALLT (`rovidNevekLancban` a
    felmenokre, `rovidNev` a csempekre). Az a levezetes FELTETEL NELKUL vagott,
    es a lanc nem is tudott volna mast: az egyediseg a teljes katalogus
    tulajdonsaga. A lanc-epites ezzel egyutt eltunt -- a terkep azonosito
    szerint valaszol, tehat a felmenoket nem kell vegigjarni ahhoz, hogy a
    JELENLEGI kategoria nevet megtudjuk.
  */
  const nev = (elem: { id?: string | null; name?: string | null }) =>
    (elem.id ? nevek?.get(elem.id) : undefined) ?? (elem.name ?? "").trim()
  const sajatRovid = nev(category)

  return (
    <main className="content-container py-8" data-testid="category-container">
      <Breadcrumbs category={category} nevek={nevek} />
      <section
        className="grid gap-6 border-b pb-8 medium:grid-cols-[minmax(0,1fr)_320px]"
        style={{ borderColor: "var(--terv-keret)" }}
      >
        <div>
          <h1
            className="text-3xl font-semibold"
            data-testid="category-page-title"
            style={{ color: "var(--terv-szoveg)" }}
          >
            {sajatRovid}
          </h1>
          {category.description ? (
            <p
              className="mt-3 max-w-2xl text-base leading-relaxed"
              style={{ color: "var(--terv-szoveg-halvany)" }}
            >
              {category.description}
            </p>
          ) : null}
        </div>
        <aside
          className="border p-5"
          data-testid={`category-helper-${kind}`}
          style={{
            borderColor: "var(--terv-kiemel)",
            background: "var(--terv-hatter-lap)",
          }}
        >
          <p
            className="text-xs font-semibold tracking-wide"
            style={{ color: "var(--terv-kiemel-tinta)" }}
          >
            {helper.eyebrow}
          </p>
          <h2
            className="mt-2 text-lg font-semibold"
            style={{ color: "var(--terv-szoveg)" }}
          >
            {helper.title}
          </h2>
          <p
            className="mt-2 text-sm leading-relaxed"
            style={{ color: "var(--terv-szoveg-halvany)" }}
          >
            {helper.description}
          </p>
          {kind === "technical" ? (
            <a
              href="#category-products"
              className="mt-4 inline-flex min-h-10 items-center px-4 text-sm font-semibold"
              style={{
                background: "var(--terv-kiemel)",
                color: "var(--terv-kiemel-szoveg)",
              }}
            >
              Segéd indítása
            </a>
          ) : null}
        </aside>
      </section>

      {children.length > 0 ? (
        <section className="py-10" aria-labelledby="subcategories-title">
          <h2
            id="subcategories-title"
            className="mb-5 text-xl font-semibold"
            style={{ color: "var(--terv-szoveg)" }}
          >
            Alkategóriák
          </h2>
          <ul className="flex gap-4 overflow-x-auto pb-2 medium:grid medium:grid-cols-5 medium:overflow-visible">
            {children.map((child) => (
              <li key={child.id} className="min-w-[180px] medium:min-w-0">
                <LocalizedClientLink
                  href={`/categories/${child.handle}`}
                  className="flex min-h-28 items-end border p-4 transition-colors hover:border-[var(--terv-kiemel)]"
                  style={{
                    borderColor: "var(--terv-keret)",
                    background: "var(--terv-hatter-lap)",
                    color: "var(--terv-szoveg)",
                  }}
                >
                  <span className="font-semibold">{nev(child)}</span>
                </LocalizedClientLink>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section
        id="category-products"
        className="border-t py-10"
        style={{ borderColor: "var(--terv-keret)" }}
      >
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--terv-szoveg)" }}
          >
            Termékek
          </h2>
          <span
            className="hidden text-sm small:block"
            style={{ color: "var(--terv-szoveg-halvany)" }}
          >
            {kind === "technical" ? "Műszaki felszerelés" : "Élő állat"}
          </span>
        </div>
        <Suspense
          fallback={<SkeletonProductGrid numberOfProducts={PRODUCT_LIMIT} />}
        >
          <CategoryProducts
            categoryId={category.id}
            countryCode={countryCode}
            kind={kind}
            optionValueIds={optionValueIds}
            page={pageNumber}
            sortBy={sortBy}
          />
        </Suspense>
      </section>

      {category.description ? (
        <section
          className="hidden border p-8 small:block"
          style={{
            borderColor: "var(--terv-keret)",
            background: "var(--terv-hatter-halvany)",
          }}
        >
          <h2
            className="text-xl font-semibold"
            style={{ color: "var(--terv-szoveg)" }}
          >
            A kategóriáról
          </h2>
          <p
            className="mt-3 max-w-3xl leading-relaxed"
            style={{ color: "var(--terv-szoveg-halvany)" }}
          >
            {category.description}
          </p>
        </section>
      ) : null}
    </main>
  )
}
