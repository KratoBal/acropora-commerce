import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "en-hu" }),
  usePathname: () => "/en-hu",
}))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { MobilMenu } from "@modules/layout/templates/nav/mobil-menu"
import { KosarLink, kosarFelirat } from "./kosar-link"

/**
 * A KOSAR-LINK ES A MOBIL MENU ANGOLUL. MI PIROSIT: ha az angol kosar-link olvasoja magyar mondatot kap; ha a mobil menu gombjanak
 * es mezojenek felirata magyar marad; ha a magyar kosar-link mas lesz, mint "Kosár · N".
 */
afterEach(cleanup)

describe("a kosár-link", () => {
  it("angolul Cart, a felolvasó Cart · N-t kap", () => {
    render(<KosarLink darab={2} locale="en" />)
    const link = screen.getByTestId("nav-cart-link")
    expect(link.getAttribute("aria-label")).toBe("Cart · 2")
    expect(link.textContent).toBe("Cart 2")
  })

  it("alapértelmezésben magyar, változatlanul", () => {
    render(<KosarLink darab={2} />)
    expect(screen.getByTestId("nav-cart-link").getAttribute("aria-label")).toBe(
      "Kosár · 2",
    )
    expect(kosarFelirat(0)).toBe("Kosár · 0")
  })
})

describe("a mobil menü", () => {
  it("angolul a gomb, a kereső és a fiók felirata angol", () => {
    render(<MobilMenu pontok={[]} keresoCel="/en-hu/store" />)
    expect(
      screen.getByTestId("mobil-menu-gomb").getAttribute("aria-label"),
    ).toBe("Open the menu")
    expect(screen.getByPlaceholderText("Search")).toBeTruthy()
    expect(screen.getByText("Account")).toBeTruthy()
  })
})
