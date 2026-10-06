import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vitest"

import SplitNotice from "./split-notice"

afterEach(() => cleanup())

/**
 * A KÉT RENDELÉS SÁVJA (P4-2). MI PIROSIT: ha nem mondja ki a két rendelést;
 * ha nem nevezi meg a bolti tételt; ha rejtve is megjelenik.
 */
describe("a két rendelés sávja", () => {
  it("kimondja a két rendelést, és megnevezi a bolti tételt", () => {
    render(<SplitNotice lines={["Mithrax tarisznyarák"]} />)
    expect(screen.getByTestId("split-notice-lead").textContent).toBe(
      "Az élő állat miatt két rendelésed keletkezik.",
    )
    expect(screen.getByTestId("split-notice-lines").textContent).toBe(
      "Mithrax tarisznyarák · a boltban veszed át",
    )
  })

  /**
   * A FIZETÉS MONDATA A VÁLASZTOTT MÓD SZERINT (acrobot 26682; emlék 1933).
   * MI PIROSIT: ha kártyánál azt mondaná, hogy az élő állatot a boltban
   * fizeted (ott egy fizetés viszi a kettőt); ha utánvétnél egy fizetést
   * ígérne; ha választott mód nélkül csak az egyik utat írná le.
   */
  it("a fizetés mondata a választott mód szerint", () => {
    const { rerender } = render(
      <SplitNotice lines={["Mithrax"]} fizetes="kartya" />,
    )
    expect(screen.getByTestId("split-notice-payment").textContent).toBe(
      "Kártyás fizetésnél a két rendelést egy fizetéssel rendezed.",
    )
    rerender(<SplitNotice lines={["Mithrax"]} fizetes="utanvet" />)
    expect(screen.getByTestId("split-notice-payment").textContent).toBe(
      "Utánvétnél a kiszállított rendelést a csomag átvételekor fizeted, az élő állatot a boltban.",
    )
    rerender(<SplitNotice lines={["Mithrax"]} />)
    const nincs = screen.getByTestId("split-notice-payment").textContent ?? ""
    expect(nincs).toContain("egy fizetéssel")
    expect(nincs).toContain("utánvétnél")
  })

  it("a két rendelés ténye és az átvétel helye minden módnál ott áll", () => {
    render(<SplitNotice lines={["Mithrax"]} fizetes="kartya" />)
    const sav = screen.getByTestId("split-notice").textContent ?? ""
    expect(sav).toContain("két rendelés lesz belőle")
    expect(sav).toContain("Az élő állatot a boltban veszed át.")
    expect(sav).not.toContain("ott fizeted")
  })

  it("rejtve nem jelenik meg", () => {
    render(<SplitNotice lines={["Mithrax"]} visible={false} />)
    expect(screen.queryByTestId("split-notice")).toBeNull()
  })
})
