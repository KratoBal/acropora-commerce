import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
}))
const akcio = vi.fn()
vi.mock("@lib/data/jelszo-visszaallitas", () => ({
  jelszoVisszaallitasAkcio: vi.fn(),
  ujJelszoAkcio: (...args: unknown[]) => akcio(...args),
}))

import UjJelszo from "./index"

/*
  MI PIROSIT (kartya 7bfca4eb): a token a lap betoltesekor a bolthoz megy (egy levelszkenner igy jelszot allitana); a token a cimsorban
  marad; token nelkul vagy nem token alaku szoveggel az urlap jelenik meg ervenytelen link helyett; a beküldes nem a rejtett mezobol
  viszi a tokent; a siker utan az urlap marad; a hiba utan a jelszavak visszatoltodnek; az "ervenytelen link" hibanal nincs uj link kerese.
*/
const TOKEN =
  "eyJhbGciOiJIUzI1NiJ9.eyJlbnRpdHlfaWQiOiJ2In0.c2lnbmF0dXJlLTEyMzQ1Ng"
const cim = (kereses: string) =>
  window.history.replaceState(null, "", `/hu/uj-jelszo${kereses}`)
afterEach(() => {
  cleanup()
  akcio.mockReset()
})
const ir = (testid: string, ertek: string) =>
  fireEvent.change(screen.getByTestId(testid), { target: { value: ertek } })
const bekuld = async () => {
  await act(async () => {
    fireEvent.submit(
      screen.getByTestId("uj-jelszo-page").querySelector("form")!,
    )
  })
}

describe("az új jelszó lapja", () => {
  it("a token a címből jön, a címsorból kikerül, és a lap betöltésekor NEM megy a bolthoz", async () => {
    cim(`?token=${TOKEN}`)
    render(<UjJelszo />)
    await act(async () => {})
    expect(screen.getByTestId("uj-jelszo-gomb")).toBeTruthy()
    expect(window.location.search).toBe("")
    expect(akcio).not.toHaveBeenCalled()
  })

  it("a beküldés a rejtett mezőből viszi a tokent és a két jelszót; a siker után az űrlap eltűnik és a belépés linkje áll a helyén", async () => {
    cim(`?token=${TOKEN}`)
    akcio.mockResolvedValue({ state: "success" })
    render(<UjJelszo />)
    await act(async () => {})
    ir("uj-jelszo-input", "Eleg-hosszu-jelszo")
    ir("uj-jelszo-ujra-input", "Eleg-hosszu-jelszo")
    await bekuld()
    const urlap = akcio.mock.calls[0][1] as FormData
    expect(urlap.get("token")).toBe(TOKEN)
    expect(urlap.get("password")).toBe("Eleg-hosszu-jelszo")
    expect(urlap.get("password_again")).toBe("Eleg-hosszu-jelszo")
    expect(screen.getByTestId("uj-jelszo-kesz").textContent).toBe(
      "Az új jelszavad mentve. Most már beléphetsz vele.",
    )
    expect(screen.getByTestId("uj-jelszo-belepes").getAttribute("href")).toBe(
      "/hu/account",
    )
    expect(screen.queryByTestId("uj-jelszo-gomb")).toBeNull()
  })

  it("token nélkül, vagy nem token alakú szöveggel az 'érvénytelen link' mondat áll, az új link kérésével, űrlap nélkül", async () => {
    for (const kereses of ["", "?token=", "?token=nem-token", "?valami=1"]) {
      cim(kereses)
      render(<UjJelszo />)
      await act(async () => {})
      expect([
        kereses,
        screen.queryByTestId("uj-jelszo-nincs-link")?.textContent,
      ]).toEqual([
        kereses,
        "Ez a link nem érvényes. Kérj újat az „Elfelejtett jelszó” oldalon.",
      ])
      expect(screen.getByTestId("uj-jelszo-uj-link").getAttribute("href")).toBe(
        "/hu/elfelejtett-jelszo",
      )
      expect(screen.queryByTestId("uj-jelszo-gomb")).toBeNull()
      cleanup()
    }
  })

  it("lejárt link (a bolt 401-e): a hiba magyar mondat, az új link kérése ott áll, és a jelszavak nem töltődnek vissza", async () => {
    cim(`?token=${TOKEN}`)
    akcio.mockResolvedValue({ state: "error", error: "reset_link_invalid" })
    render(<UjJelszo />)
    await act(async () => {})
    ir("uj-jelszo-input", "Eleg-hosszu-jelszo")
    ir("uj-jelszo-ujra-input", "Eleg-hosszu-jelszo")
    await bekuld()
    expect(screen.getByTestId("uj-jelszo-hiba").textContent).toContain(
      "Ez a link már nem érvényes",
    )
    expect(
      screen.getByTestId("uj-jelszo-uj-link-hiba").getAttribute("href"),
    ).toBe("/hu/elfelejtett-jelszo")
    expect(
      (screen.getByTestId("uj-jelszo-input") as HTMLInputElement).value,
    ).toBe("")
  })

  it("rövid jelszó hibánál nincs új link kérése (a link még jó), és a token a következő beküldéshez megmarad", async () => {
    cim(`?token=${TOKEN}`)
    akcio.mockResolvedValue({ state: "error", error: "password_short" })
    render(<UjJelszo />)
    await act(async () => {})
    ir("uj-jelszo-input", "rovid")
    ir("uj-jelszo-ujra-input", "rovid")
    await bekuld()
    expect(screen.getByTestId("uj-jelszo-hiba").textContent).toBe(
      "A jelszó legalább 10 karakter legyen.",
    )
    expect(screen.queryByTestId("uj-jelszo-uj-link-hiba")).toBeNull()
    akcio.mockResolvedValue({ state: "success" })
    ir("uj-jelszo-input", "Eleg-hosszu-jelszo")
    ir("uj-jelszo-ujra-input", "Eleg-hosszu-jelszo")
    await bekuld()
    expect((akcio.mock.calls[1][1] as FormData).get("token")).toBe(TOKEN)
  })
})
