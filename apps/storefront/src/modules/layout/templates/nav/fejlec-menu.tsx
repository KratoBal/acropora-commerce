"use client"

import { ArrowRightMini, XMark } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { KeyboardEvent, useEffect, useId, useRef, useState } from "react"

type Category = HttpTypes.StoreProductCategory

/**
 * This is deliberately not derived from the category tree. The requested quick
 * links need a separate content decision before they can become real links.
 */
const QUICK_LINK_PLACEHOLDER = "A gyorslinkek tartalma külön döntés."
const PANEL_TOP = "calc(var(--fejlec-magassag) + 36px)"

const selectedCategory = (categories: Category[], selectedId: string | null) =>
  categories.find((category) => category.id === selectedId) ?? categories[0]

export const categoryGroups = (category: Category | undefined) =>
  (category?.category_children ?? []).filter(
    (child) => (child.category_children ?? []).length > 0,
  )

export const directCategoryLinks = (category: Category | undefined) =>
  (category?.category_children ?? []).filter(
    (child) => (child.category_children ?? []).length === 0,
  )

export const FejlecMenu = ({ kategoriak }: { kategoriak: Category[] }) => {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(
    kategoriak[0]?.id ?? null,
  )
  const [mobileDetails, setMobileDetails] = useState(false)
  const categoryButtons = useRef<(HTMLButtonElement | null)[]>([])
  const panel = useRef<HTMLElement | null>(null)
  const panelId = useId()
  const selected = selectedCategory(kategoriak, selectedId)
  const groups = categoryGroups(selected)
  const directLinks = directCategoryLinks(selected)

  const close = () => {
    setOpen(false)
    setMobileDetails(false)
  }

  useEffect(() => {
    if (!open) return

    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") close()
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [open])

  /**
   * A FOKUSZ A PANELEN BELUL MARAD, AMIG NYITVA VAN.
   *
   * Merve elo bongeszoben (2026-09-09, billentyuzettel bejarva): a nyitott
   * panelbol a HARMADIK Tab utan a fokusz kilepett a lap MOGOTTE ALLO
   * tartalmara -- kosar, morzsamenu, fulek, lablec --, holott a panel azokat
   * teljesen elfedi. Egy `role="dialog"`, ami elfed mindent, de a fokuszt
   * atengedi, a billentyuzetes felhasznalot lathatatlan elemek koze viszi.
   *
   * A megoldas nem a `tabindex` atirasa a lap tobbi reszen (az minden uj
   * elemnel ujra elromlana), hanem a korbeforgatas a panel hataran.
   */
  useEffect(() => {
    if (!open) return

    const onTab = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "Tab") return

      const doboz = panel.current
      if (!doboz) return

      const elemek = Array.from(
        doboz.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      )
      if (elemek.length === 0) return

      const elso = elemek[0]
      const utolso = elemek[elemek.length - 1]
      const aktiv = document.activeElement

      /*
        A KIVUL ALLO FOKUSZ IS VISSZAKERUL. Nem eleg a ket veget kezelni: ha a
        fokusz barmiert a panelen KIVUL all (peldaul a nyito gombon, ahonnan a
        panel nyilt), akkor a kovetkezo Tab a lap mogottes reszere vinne.
      */
      if (!aktiv || !doboz.contains(aktiv)) {
        event.preventDefault()
        ;(event.shiftKey ? utolso : elso).focus()
        return
      }

      if (!event.shiftKey && aktiv === utolso) {
        event.preventDefault()
        elso.focus()
      } else if (event.shiftKey && aktiv === elso) {
        event.preventDefault()
        utolso.focus()
      }
    }

    window.addEventListener("keydown", onTab)
    return () => window.removeEventListener("keydown", onTab)
  }, [open])

  if (kategoriak.length === 0) return null

  const select = (category: Category) => setSelectedId(category.id)

  const navigateCategories = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return

    event.preventDefault()
    const nextIndex =
      event.key === "ArrowDown"
        ? (index + 1) % kategoriak.length
        : (index - 1 + kategoriak.length) % kategoriak.length
    const next = kategoriak[nextIndex]

    select(next)
    categoryButtons.current[nextIndex]?.focus()
  }

  return (
    <>
      <button
        type="button"
        className="shrink-0 text-[14px] font-semibold"
        aria-controls={panelId}
        aria-expanded={open}
        onClick={() => {
          setOpen((wasOpen) => !wasOpen)
          setMobileDetails(false)
        }}
        data-testid="category-menu-button"
      >
        Menü
      </button>

      {open ? (
        <>
          <section
            id={panelId}
            role="dialog"
            aria-modal="true"
            aria-label="Kategóriamenü"
            ref={panel}
            className="fixed inset-x-0 bottom-0 z-[61] overflow-y-auto"
            style={{
              top: PANEL_TOP,
              background: "var(--terv-hatter)",
              color: "var(--terv-szoveg)",
            }}
            /*
              A PANEL SAJAT FOLDJERE KATTINTVA ZAR -- ES EZ VALTOTTA FEL A
              KULON HATTERLAPOT.

              Volt itt egy `category-menu-backdrop` gomb, es EGERREL SOHA NEM
              LEHETETT ELERNI: pontosan ugyanazt a teglalapot foglalta el, mint
              a panel (mind a ketto `fixed inset-x-0 bottom-0`, ugyanazzal a
              `top` ertekkel), a panel pedig folotte allt (z-61 kontra z-60) es
              atlatszatlan hatteret viselt. Merve elo bongeszoben (acrobot,
              2026-09-09 18:44): a bal also sarokban az `elementFromPoint` a
              PANELT adta vissza, es a savon kivul kattintva a panel nyitva
              maradt.

              Ugyanez az ok arra is, hogy a fekete atlatszo fatyol (`bg-black/60`)
              soha nem latszott: teljesen elfedte a panel.

              A jelenlegi alak azt zarja be, ami a felhasznalo szamara tenyleg
              "kivul" van: a tartalom-hasab (max 1352 pixel) melletti sav es a
              tartalom alatti ures resz. A `currentTarget` vizsgalat kell hozza,
              kulonben minden belso kattintas is zarna.
            */
            onClick={(event) => {
              if (event.target === event.currentTarget) close()
            }}
            data-testid="category-menu-panel"
          >
            <div className="mx-auto grid min-h-full w-full max-w-[1352px] grid-cols-1 lg:grid-cols-[250px_340px_minmax(0,1fr)]">
              <aside
                className="border-b p-6 lg:border-b-0 lg:border-r"
                style={{
                  borderColor: "var(--terv-keret)",
                  background: "var(--terv-kiemel)",
                  color: "var(--terv-kiemel-szoveg)",
                }}
                data-testid="category-menu-quick-links"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-semibold">Gyorslinkek</h2>
                    <p className="mt-3 text-sm leading-relaxed">
                      {QUICK_LINK_PLACEHOLDER}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={close}
                    className="p-1"
                    aria-label="Menü bezárása"
                    data-testid="category-menu-close"
                  >
                    <XMark />
                  </button>
                </div>
              </aside>

              <section
                className={mobileDetails ? "hidden lg:block" : "block"}
                aria-label="Fő kategóriák"
                data-testid="category-menu-top-level"
              >
                <h2 className="px-6 pt-6 text-sm font-semibold uppercase tracking-wide lg:sr-only">
                  Fő kategóriák
                </h2>
                <ul className="p-3 lg:p-0">
                  {kategoriak.map((category, index) => {
                    const active = selected?.id === category.id

                    return (
                      <li key={category.id}>
                        <button
                          ref={(element) => {
                            categoryButtons.current[index] = element
                          }}
                          type="button"
                          onMouseEnter={() => select(category)}
                          onFocus={() => select(category)}
                          onClick={() => {
                            select(category)
                            setMobileDetails(true)
                          }}
                          onKeyDown={(event) =>
                            navigateCategories(event, index)
                          }
                          className="flex min-h-14 w-full items-center justify-between px-5 text-left text-base transition-colors"
                          style={{
                            background: active
                              ? "var(--terv-hatter-halvany)"
                              : "transparent",
                            color: "var(--terv-szoveg)",
                          }}
                          data-testid="category-menu-top-level-item"
                        >
                          <span>{category.name}</span>
                          <ArrowRightMini aria-hidden="true" />
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </section>

              <section
                className={mobileDetails ? "block" : "hidden lg:block"}
                aria-live="polite"
                aria-label={
                  selected ? `${selected.name} alkategóriái` : "Alkategóriák"
                }
                data-testid="category-menu-subcategories"
              >
                <div
                  className="border-t p-6 lg:border-l lg:border-t-0"
                  style={{ borderColor: "var(--terv-keret)" }}
                >
                  <button
                    type="button"
                    className="mb-6 flex items-center gap-2 text-sm font-semibold lg:hidden"
                    onClick={() => setMobileDetails(false)}
                    data-testid="category-menu-back"
                  >
                    <span aria-hidden="true">←</span>
                    Vissza a kategóriákhoz
                  </button>
                  {selected ? (
                    <LocalizedClientLink
                      href={`/categories/${selected.handle}`}
                      className="text-xl font-semibold"
                      onClick={close}
                    >
                      {selected.name}
                    </LocalizedClientLink>
                  ) : null}

                  {groups.length > 0 ? (
                    <div className="mt-7 grid gap-8 sm:grid-cols-2">
                      {groups.map((group) => (
                        <section key={group.id}>
                          <LocalizedClientLink
                            href={`/categories/${group.handle}`}
                            className="text-sm font-semibold uppercase tracking-wide"
                            onClick={close}
                          >
                            {group.name}
                          </LocalizedClientLink>
                          <ul className="mt-3 space-y-3">
                            {(group.category_children ?? []).map((child) => (
                              <li key={child.id}>
                                <LocalizedClientLink
                                  href={`/categories/${child.handle}`}
                                  className="text-sm hover:underline"
                                  style={{
                                    color: "var(--terv-szoveg-halvany)",
                                  }}
                                  onClick={close}
                                >
                                  {child.name}
                                </LocalizedClientLink>
                              </li>
                            ))}
                          </ul>
                        </section>
                      ))}
                    </div>
                  ) : null}

                  {directLinks.length > 0 ? (
                    <ul className="mt-7 grid gap-3 sm:grid-cols-2">
                      {directLinks.map((child) => (
                        <li key={child.id}>
                          <LocalizedClientLink
                            href={`/categories/${child.handle}`}
                            className="text-sm hover:underline"
                            style={{ color: "var(--terv-szoveg-halvany)" }}
                            onClick={close}
                          >
                            {child.name}
                          </LocalizedClientLink>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </section>
            </div>
          </section>
        </>
      ) : null}
    </>
  )
}
