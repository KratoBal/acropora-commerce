import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

let orszag = "hu"
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszag }),
}))
const akcio = vi.fn()
vi.mock("@lib/data/jelszo-visszaallitas", () => ({
  jelszoVisszaallitasAkcio: (...args: unknown[]) => akcio(...args),
  ujJelszoAkcio: vi.fn(),
}))

import ElfelejtettJelszo from "./index"

/*
  MI PIROSIT (kartya 7bfca4eb): az urlap nem az e-mail-mezot es a nyelvet viszi; a siker utan az urlap marad (a latogato ujra kuldene);
  a siker mondata azt allitja, hogy a levelet MAR elkuldtuk (az a bolt kapcsolojatol fugg, nem tudjuk) vagy elarulja, van-e fiok; a hiba
  utan a beirt cim kiurul; a vissza-link nem a belepesre visz; az angol lapon magyar szoveg.
*/
afterEach(() => {
  cleanup()
  akcio.mockReset()
  orszag = "hu"
})
const bekuld = async () => {
  await act(async () => {
    fireEvent.submit(
      screen.getByTestId("elfelejtett-jelszo-page").querySelector("form")!,
    )
  })
}

describe("az elfelejtett jelszó lapja", () => {
  it("egy e-mail-mező és a gomb, a vissza-link a belépésre visz", () => {
    render(<ElfelejtettJelszo />)
    const lap = screen.getByTestId("elfelejtett-jelszo-page")
    expect(lap.querySelector("h1")!.textContent).toBe("Elfelejtett jelszó")
    expect(
      (screen.getByTestId("elfelejtett-email-input") as HTMLInputElement).type,
    ).toBe("email")
    expect(screen.getByTestId("elfelejtett-jelszo-gomb").textContent).toBe(
      "Link küldése",
    )
    expect(screen.getByTestId("elfelejtett-vissza").getAttribute("href")).toBe(
      "/hu/account",
    )
  })

  it("a beküldés a címet és a nyelvet viszi, és a siker után az űrlap eltűnik: általános mondat, a levél elküldését nem állítja", async () => {
    akcio.mockResolvedValue({ state: "success" })
    render(<ElfelejtettJelszo />)
    fireEvent.change(screen.getByTestId("elfelejtett-email-input"), {
      target: { value: "vevo@example.hu" },
    })
    await bekuld()
    const urlap = akcio.mock.calls[0][1] as FormData
    expect(urlap.get("email")).toBe("vevo@example.hu")
    expect(urlap.get("locale")).toBe("hu")
    const kesz = screen.getByTestId("elfelejtett-jelszo-kesz").textContent!
    expect(kesz).toContain("Ha ehhez a címhez tartozik fiók")
    expect(kesz).not.toMatch(/elküldtük|küldtünk|elküldve/i)
    expect(screen.queryByTestId("elfelejtett-email-input")).toBeNull()
  })

  it("hibánál a beírt cím megmarad, és a hiba kódja magyar mondat", async () => {
    akcio.mockResolvedValue({
      state: "error",
      error: "too_many_attempts",
      ertekek: { email: "vevo@example.hu" },
    })
    render(<ElfelejtettJelszo />)
    fireEvent.change(screen.getByTestId("elfelejtett-email-input"), {
      target: { value: "vevo@example.hu" },
    })
    await bekuld()
    expect(screen.getByTestId("elfelejtett-jelszo-hiba").textContent).toBe(
      "Túl sok próbálkozás. Próbáld újra pár perc múlva.",
    )
    expect(
      (screen.getByTestId("elfelejtett-email-input") as HTMLInputElement).value,
    ).toBe("vevo@example.hu")
  })

  it("az angol lapon angol szöveg és angol nyelv megy a kéréssel", async () => {
    orszag = "en-hu"
    akcio.mockResolvedValue({ state: "success" })
    render(<ElfelejtettJelszo />)
    expect(screen.getByTestId("elfelejtett-jelszo-gomb").textContent).toBe(
      "Send the link",
    )
    fireEvent.change(screen.getByTestId("elfelejtett-email-input"), {
      target: { value: "buyer@example.com" },
    })
    await bekuld()
    expect((akcio.mock.calls[0][1] as FormData).get("locale")).toBe("en")
    expect(screen.getByTestId("elfelejtett-jelszo-kesz").textContent).toContain(
      "If there is an account",
    )
  })
})
