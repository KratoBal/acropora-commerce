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
      "Mithrax tarisznyarák · a boltban veszed át és ott fizeted",
    )
  })

  it("rejtve nem jelenik meg", () => {
    render(<SplitNotice lines={["Mithrax"]} visible={false} />)
    expect(screen.queryByTestId("split-notice")).toBeNull()
  })
})
