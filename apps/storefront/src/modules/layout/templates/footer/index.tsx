import { listCategories } from "@lib/data/categories"
import { STORE_NAME } from "@lib/store"
import { listCollections } from "@lib/data/collections"
import { Text, clx } from "@modules/common/components/ui"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  })
  const productCategories = await listCategories()

  return (
    <footer className="border-t border-ui-border-base w-full">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-6 xsmall:flex-row items-start justify-between py-40">
          <div>
            <LocalizedClientLink
              href="/"
              className="txt-compact-xlarge-plus text-ui-fg-subtle hover:text-ui-fg-base uppercase"
            >
              {STORE_NAME}
            </LocalizedClientLink>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Kategóriák
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {/*
                    ELOSZOR SZURUNK GYOKERRE, AZUTAN VAGUNK.

                    A starterben forditva allt: `slice(0, 6)` a NYERS listan,
                    es a szures utana. Merve 2026-09-07 a teszt bolton: a lista
                    elso hat eleme kozott PONTOSAN EGY gyoker van ("Termékek"),
                    a masik ot az O leszarmazottja -- azokat a szures eldobta.
                    A lablec igy 219 kategoriabol 24 linket mutatott, es a bolt
                    ot masik gyokere (Halak, Korallok, Gerinctelenek, Édesvízi
                    akvarisztika, Shop 'n the Shop) SEHOL nem jelent meg.

                    Vagyis a hiba nem a darabszamban volt, hanem a SORRENDBEN:
                    ugyanaz a hat, mast jelent a szures elott es utana.
                    Szures utan vagva: 6 gyoker, 53 link.
                  */}
                  {productCategories
                    ?.filter((c) => !c.parent_category)
                    .slice(0, 6)
                    .map((c) => {
                      const children =
                        c.category_children?.map((child) => ({
                          name: child.name,
                          handle: child.handle,
                          id: child.id,
                        })) || null

                      return (
                        <li
                          className="flex flex-col gap-2 text-ui-fg-subtle txt-small"
                          key={c.id}
                        >
                          <LocalizedClientLink
                            className={clx(
                              "hover:text-ui-fg-base",
                              children && "txt-small-plus",
                            )}
                            href={`/categories/${c.handle}`}
                            data-testid="category-link"
                          >
                            {c.name}
                          </LocalizedClientLink>
                          {children && (
                            <ul className="grid grid-cols-1 ml-3 gap-2">
                              {children &&
                                children.map((child) => (
                                  <li key={child.id}>
                                    <LocalizedClientLink
                                      className="hover:text-ui-fg-base"
                                      href={`/categories/${child.handle}`}
                                      data-testid="category-link"
                                    >
                                      {child.name}
                                    </LocalizedClientLink>
                                  </li>
                                ))}
                            </ul>
                          )}
                        </li>
                      )
                    })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus txt-ui-fg-base">
                  Kollekciók
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-ui-fg-subtle txt-small",
                    {
                      "grid-cols-2": (collections?.length || 0) > 3,
                    },
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-ui-fg-base"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {/*
              A starter itt sajat linkeket tartott (GitHub, Documentation,
              Source code). Azok a MEDUSA projektjere mutattak, es a mi
              vevonknek jelentek volna meg -- ezert kikerultek.

              A helyukre a bolti tajekoztatok valok (Altalanos szerzodesi
              feltetelek, Elallasi tajekoztato, Szallitas). Azok a szovegek a
              mai boltunkban LETEZNEK, tehat atemeles lesz, nem irás.
            */}
          </div>
        </div>
        <div className="flex w-full mb-16 justify-between text-ui-fg-muted">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} {STORE_NAME}. Minden jog fenntartva.
          </Text>
        </div>
      </div>
    </footer>
  )
}
