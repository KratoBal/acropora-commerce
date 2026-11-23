import { act, cleanup, fireEvent, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({ keres: vi.fn() }))
vi.mock("@lib/data/orders", () => ({ createTransferRequest: adat.keres }))

import TransferRequestForm from "./index"

const SIKER = (id: string) => async () => ({
  success: true,
  error: null,
  order: { id },
})
const HIBA = async () => ({ success: false, error: "generic", order: null })

const bekuld = async () => {
  await act(async () => {
    fireEvent.submit(
      screen.getByPlaceholderText("Rendelésazonosító").closest("form")!,
    )
  })
}
const sikerDoboz = () => screen.queryByTestId("transfer-request-note")
const hibaSzoveg = () =>
  screen.queryByText(
    "Az átvételt most nem sikerült kérni. Próbáld újra, vagy írj nekünk.",
  )
// the only button without text: the close icon of the success box
const bezaroGomb = () =>
  screen.getAllByRole("button").find((gomb) => !gomb.textContent?.trim())!

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/**
 * A SIKERUZENET NEM TAPAD A KESOBBI HIBAS BEKULDESRE (acrobot 60040). A vevo
 * egy sikeres atvetel-keres utan masodszor is bekuld, es az sikertelen: a
 * sikeruzenet (ures azonositoval) es a hiba EGYSZERRE latszott. MI PIROSIT: a
 * sikeruzenet latszik egy hibas bekuldes utan; a hiba nem latszik; a bezaras
 * gombja nem rejti el a dobozt; a bezaras utan egy ujabb siker nem mutatja
 * meg ujra; egy ujabb siker a REGI azonositot mutatja.
 */
describe("TransferRequestForm: a sikeruzenet a legutolso bekuldest tukrozi", () => {
  it("siker: a doboz az azonositoval latszik, hiba nincs", async () => {
    adat.keres.mockImplementation(SIKER("order_A"))
    render(<TransferRequestForm />)
    expect(sikerDoboz()).toBeNull()
    await bekuld()
    expect(sikerDoboz()).not.toBeNull()
    expect(
      screen.getByText(/A\(z\) order_A rendelés átvételét kérted/),
    ).toBeTruthy()
    expect(hibaSzoveg()).toBeNull()
  })

  it("siker, majd HIBAS bekuldes: a sikeruzenet eltunik, a hiba latszik", async () => {
    adat.keres
      .mockImplementationOnce(SIKER("order_A"))
      .mockImplementationOnce(HIBA)
    render(<TransferRequestForm />)
    await bekuld()
    expect(sikerDoboz()).not.toBeNull()
    await bekuld()
    expect(adat.keres).toHaveBeenCalledTimes(2)
    expect(hibaSzoveg()).not.toBeNull()
    expect(sikerDoboz()).toBeNull()
  })

  it("siker, majd egy MASIK siker: a doboz az ujabb azonositot mutatja", async () => {
    adat.keres
      .mockImplementationOnce(SIKER("order_A"))
      .mockImplementationOnce(SIKER("order_B"))
    render(<TransferRequestForm />)
    await bekuld()
    await bekuld()
    expect(
      screen.getByText(/A\(z\) order_B rendelés átvételét kérted/),
    ).toBeTruthy()
    expect(screen.queryByText(/order_A/)).toBeNull()
  })

  it("a bezaras gombja elrejti a dobozt, es egy ujabb siker ujra megmutatja", async () => {
    adat.keres
      .mockImplementationOnce(SIKER("order_A"))
      .mockImplementationOnce(SIKER("order_B"))
    render(<TransferRequestForm />)
    await bekuld()
    fireEvent.click(bezaroGomb())
    expect(sikerDoboz()).toBeNull()
    await bekuld()
    expect(sikerDoboz()).not.toBeNull()
    expect(screen.getByText(/order_B/)).toBeTruthy()
  })

  it("a bezaras utan egy hibas bekuldes sem hoz vissza sikerdobozt", async () => {
    adat.keres
      .mockImplementationOnce(SIKER("order_A"))
      .mockImplementationOnce(HIBA)
    render(<TransferRequestForm />)
    await bekuld()
    fireEvent.click(bezaroGomb())
    await bekuld()
    expect(sikerDoboz()).toBeNull()
    expect(hibaSzoveg()).not.toBeNull()
  })
})
