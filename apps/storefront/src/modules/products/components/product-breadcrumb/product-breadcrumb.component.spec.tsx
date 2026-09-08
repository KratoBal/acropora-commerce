import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))

import ProductBreadcrumb from "./index"

afterEach(cleanup)

const termek = { id: "p1", title: "Acropora tenuis" } as never
const kategoriak = [
  { id: "c1", name: "Korallok", handle: "korallok", parent_category_id: null },
] as never

/**
 * A MORZSAMENU SZINEI TOKENBOL JONNEK (a sotet lap 4. pontja).
 *
 * === AMIT EZ MER, ES AMIT NEM ===
 *
 * A jsdom nem oldja fel a CSS-valtozokat, tehat itt a token NEVE merheto, nem
 * a festett szin. Amit bizonyit: a morzsamenu nem visel ROGZITETT szint, tehat
 * egy sotet feluletre athelyezve sem lesz olvashatatlan.
 *
 * AMIT NEM: hogy a morzsamenu MA a sotet feluleten all -- ma nem all ott, es az
 * athelyezes kulon lepes. Ez a valtozas a FELTETELE annak, nem a megvalositasa.
 */
describe("a morzsamenü színei", () => {
  /** ISMERT POZITIV KONTROLL: a morzsamenu megrajzolodik. */
  it("a morzsamenü megjelenik, a jelenlegi lappal együtt", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-lista")).toBeTruthy()
    expect(screen.getByTestId("morzsamenu-jelenlegi")).toBeTruthy()
  })

  it("a lista a halvány szöveg tokenjét viseli", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-lista").style.color).toBe(
      "var(--terv-szoveg-halvany)",
    )
  })

  it("a jelenlegi lap a szöveg tokenjét viseli", () => {
    render(<ProductBreadcrumb product={termek} categories={kategoriak} />)

    expect(screen.getByTestId("morzsamenu-jelenlegi").style.color).toBe(
      "var(--terv-szoveg)",
    )
  })

  /**
   * A HIANY-ALLITAS, AMI A LENYEG: egyetlen ROGZITETT szin sem maradhat, mert
   * pontosan azok tunnenek el egy sotet feluleten. A fenti ket allitas a
   * pozitiv fele; ez a negativ.
   */
  it("egyetlen rögzített szín-osztály sem maradt", () => {
    const { container } = render(
      <ProductBreadcrumb product={termek} categories={kategoriak} />,
    )

    expect(container.innerHTML).not.toContain("text-ui-fg-base")
    expect(container.innerHTML).not.toContain("text-ui-fg-muted")
  })
})
