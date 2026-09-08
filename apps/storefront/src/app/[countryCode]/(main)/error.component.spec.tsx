import { cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import HibaHatar from "./error"

/**
 * A `LocalizedClientLink` a `useParams`-bol veszi az orszag-kodot, es router-
 * kontextus nelkul `null`-t kap. Ugyanaz a mock-alak, amit a repo mar hasznal
 * (stock-state, valodi-tartalom, empty-cart-message).
 */
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))

afterEach(cleanup)

/**
 * AMIT EZ A KESZLET MER, ES AMIT NEM.
 *
 * MERI: hogy a komponens magyarul jelenik meg, hogy az ujraprobalas TENYLEG a
 * Next.js `reset` fuggvenyet hivja, es hogy a hibauzenet MAGA nem kerul a lapra.
 *
 * NEM MERI: hogy a Next.js ezt a fajlt hasznalja hatarkent. Az keretrendszer-
 * konvencio (a szegmens mappajaban allo `error.tsx`), nem futasidoben eldontheto
 * allitas -- egy teszt, ami ezt allitana, a konvenciot ismetelne, nem merne.
 */
const hiba = () =>
  Object.assign(new Error("belso reszlet, ami NEM mehet a lapra"), {
    digest: "abc123",
  })

describe("a nyilvanos lapok hiba-hatara", () => {
  it("magyarul jelenik meg, es visszavezeto utat kinal", () => {
    render(<HibaHatar error={hiba()} reset={vi.fn()} />)

    expect(screen.getByText("Hiba történt")).toBeTruthy()
    expect(
      screen.getByText(/Az oldal betöltése közben hiba történt/),
    ).toBeTruthy()
    expect(screen.getByText("Vissza a főoldalra")).toBeTruthy()
    expect(screen.getByText("Termékek")).toBeTruthy()
  })

  /**
   * A `reset` A NEXT.JS SAJAT UJRAPROBALASA. Ha a gomb nem ezt hivja, a lap
   * ugyanugy kinez, es a vevo hiaba kattint -- nema hiba.
   */
  it("az ujraprobalas a reset fuggvenyt hivja", () => {
    const reset = vi.fn()
    render(<HibaHatar error={hiba()} reset={reset} />)

    fireEvent.click(screen.getByTestId("hiba-ujraprobalas"))

    expect(reset).toHaveBeenCalledTimes(1)
  })

  /**
   * A HIBAUZENET NEM KERUL A LAPRA. Belso reszletet hordozhat (utvonal,
   * lekerdezes, azonosito), es a vevo szamara semmit nem mond. Ez az allitas
   * NEM a mai szoveget rogziti, hanem a hatart: ha valaki egyszer kiirja a
   * `error.message`-t, ez pirosodik.
   */
  it("a hibauzenetet NEM irja ki a vevonek", () => {
    render(<HibaHatar error={hiba()} reset={vi.fn()} />)

    expect(screen.queryByText(/belso reszlet/)).toBeNull()
    expect(screen.queryByText(/abc123/)).toBeNull()
  })
})
