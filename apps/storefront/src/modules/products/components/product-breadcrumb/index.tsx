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
      {/*
        A MORZSAMENU SZINEI TOKENBOL JONNEK -- ES MA EZ MEG NEM LATSZIK.

        === MIERT MEGY MEGIS ELSONEK ===

        Picasso negyedik pontja szerint a morzsamenunek ugyanabban a sotet
        sikban kell allnia, mint a fejlecnek es a tartalomnak. Ma a vazon KIVUL
        all, vilagos hatteren, tehat a rogzitett szinei helyesek.

        AMINT VISZONT A SOTET FELULETRE KERUL, ugyanaz tortenne, mint az arral
        (415f455c): a `text-ui-fg-muted` es a `text-ui-fg-base` ROGZITETT szin,
        nem ismeri a `data-vilag` kapcsolot, tehat sotet szoveg allna sotet
        feluleten.

        Ezert ez a valtozas ELOBB megy, mint az athelyezes: onmagaban semmit nem
        ront el (a vilagos lapon a token gyakorlatilag ugyanazt adja), es az
        athelyezes utan mar nem lehet elfelejteni. Forditva egy ismert hibat
        szallitanank ki ujra.

        === AMI SZANDEKOSAN MARAD ===

        A `focus-visible:outline-ui-fg-interactive` fokusz-gyuru. Az nem
        szoveg-szin, es hogy a fokusz milyen szint kapjon, tervezoi dontes --
        nem vezetem le magamtol egy szoveg-token cserejebol.

        A `hover:text-ui-fg-base` KIKERULT: a lebegtetett allapot ma a
        rogzitett alapszinre valtott volna, ami a sotet lapon eppen olvashatatlan.

        === ES MEGJOTT A DONTES (acrobot, msg 15614) ===

        "A link a lista szinet orokolje, ahogy most csinaltad, ES a lebegtetes
        a `--terv-szoveg` tokent kapja."

        Ez UGYANAZ a token, amit a sor VEGE visel (a mai termek neve). Vagyis a
        lebegtetes nem egy harmadik hangero, hanem a lista felhozasa arra a
        szintre, amin a jelenlegi elem all -- es epp ezert nem kellett hozza uj
        token.

        MIND A KET VILAGBAN ERTELMES, es ez a lenyeg: a `--terv-szoveg` vilagosban
        sotet (0.2), soteten vilagos (0.95), tehat a lebegtetes mindket lapon
        "kicsit hangosabb". A regi rogzitett szin csak az egyiken volt az.

        MIERT OSZTALY ES NEM BEAGYAZOTT STILUS: egy beagyazott `style` nem ismer
        allapotot. A tokent ezert a Tailwind konfig nevesiti
        (`textColor: { "terv-szoveg" }`), ugyanugy, mint a szerif betut a #235-ben.
      */}
      <ol
        className="flex min-w-max items-center gap-2 text-sm"
        style={{ color: "var(--terv-szoveg-halvany)" }}
        data-testid="morzsamenu-lista"
      >
        <li>
          <LocalizedClientLink
            className="hover:text-terv-szoveg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
            href="/"
          >
            Főoldal
          </LocalizedClientLink>
        </li>
        {path.map((category) => (
          <li key={category.id} className="flex items-center gap-2">
            <span aria-hidden="true">/</span>
            <LocalizedClientLink
              className="hover:text-terv-szoveg focus-visible:outline focus-visible:outline-2 focus-visible:outline-ui-fg-interactive"
              href={`/categories/${category.handle}`}
            >
              {category.name.trim()}
            </LocalizedClientLink>
          </li>
        ))}
        <li
          className="flex min-w-0 items-center gap-2"
          style={{ color: "var(--terv-szoveg)" }}
          data-testid="morzsamenu-jelenlegi"
          aria-current="page"
        >
          <span aria-hidden="true">/</span>
          <span className="max-w-48 truncate">{product.title}</span>
        </li>
      </ol>
    </nav>
  )
}
