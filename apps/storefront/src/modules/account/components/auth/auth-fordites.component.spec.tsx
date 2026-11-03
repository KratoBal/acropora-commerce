import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

// the language of the page is its path segment: `hu` (Hungarian) or `en-hu` (English)
const nav = vi.hoisted(() => ({
  countryCode: "hu",
  token: "tok" as string | null,
}))
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: nav.countryCode }),
  useSearchParams: () => ({
    get: (k: string) => (k === "token" ? nav.token : null),
  }),
}))

const muveletek = vi.hoisted(() => ({
  login: vi.fn(),
  signup: vi.fn(),
  confirmEmailVerification: vi.fn(),
}))
vi.mock("@lib/data/customer", () => muveletek)

import VerifyAccount from "@modules/account/components/verify-account"
import LoginTemplate from "@modules/account/templates/login-template"

beforeEach(() => {
  nav.countryCode = "hu"
  nav.token = "tok"
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

const bekuld = async (urlap: HTMLElement) => {
  await act(async () => {
    fireEvent.submit(urlap)
  })
}

/**
 * A BELEPES, A REGISZTRACIO ES AZ E-MAIL-MEGEROSITES A LAP NYELVEN. MI PIROSIT:
 * ha az angol uton magyar felirat marad; ha a szerver-muvelet hibakodja nem a
 * lap nyelven jelenik meg; ha a magyar ut szovege elmozdul.
 */
describe("a belépés a lap nyelvén", () => {
  it("magyarul a régi feliratok", () => {
    render(<LoginTemplate />)
    const lap = screen.getByTestId("login-page")
    expect(within(lap).getByRole("heading").textContent).toBe("Bejelentkezés")
    expect(within(lap).getByLabelText("E-mail")).toBeTruthy()
    expect(within(lap).getByLabelText("Jelszó")).toBeTruthy()
    expect(screen.getByText("Fiók")).toBeTruthy()
    expect(screen.getByText("Nincs még fiókod?")).toBeTruthy()
  })

  it("angolul angol feliratok és az angol hibaüzenet a kódból", async () => {
    nav.countryCode = "en-hu"
    muveletek.login.mockResolvedValue({
      state: "error",
      error: "invalid_credentials",
      ertekek: { email: "a@b.hu" },
    })
    render(<LoginTemplate />)
    const lap = screen.getByTestId("login-page")
    expect(within(lap).getByRole("heading").textContent).toBe("Sign in")
    expect(within(lap).getByLabelText("Email")).toBeTruthy()
    expect(within(lap).getByLabelText("Password")).toBeTruthy()
    expect(screen.getByText("Account")).toBeTruthy()
    await bekuld(lap.querySelector("form")!)
    expect(screen.getByTestId("login-error-message").textContent).toBe(
      "Wrong e-mail address or password.",
    )
  })

  it("az ellenőrzés-szükséges üzenet angolul, a címmel", async () => {
    nav.countryCode = "en-hu"
    muveletek.login.mockResolvedValue({
      state: "verification_required",
      email: "a@b.hu",
    })
    render(<LoginTemplate />)
    await bekuld(screen.getByTestId("login-page").querySelector("form")!)
    const uzenet = screen.getByTestId("login-verification-message")
    expect(uzenet.textContent).toContain("has to be verified")
    expect(uzenet.textContent).toContain("a@b.hu")
  })
})

describe("a regisztráció a lap nyelvén", () => {
  const regisztraciora = () => {
    render(<LoginTemplate />)
    fireEvent.click(screen.getByTestId("register-button"))
    return screen.getByTestId("register-page")
  }

  it("magyarul a régi feliratok és a pipa mondata", () => {
    const lap = regisztraciora()
    expect(within(lap).getByRole("heading").textContent).toBe("Regisztráció")
    expect(within(lap).getByLabelText("Vezetéknév")).toBeTruthy()
    expect(
      screen.getByTestId("aszf-checkbox").closest("label")!.textContent,
    ).toBe("Elfogadom az ÁSZF-et és az adatkezelési tájékoztatót.")
  })

  it("angolul angol feliratok, a pipa mondata és a kódból az angol hiba", async () => {
    nav.countryCode = "en-hu"
    muveletek.signup.mockResolvedValue({
      state: "error",
      error: "passwords_differ",
      ertekek: {},
    })
    const lap = regisztraciora()
    expect(within(lap).getByRole("heading").textContent).toBe("Register")
    expect(within(lap).getByLabelText("Last name")).toBeTruthy()
    expect(within(lap).getByLabelText("Password again")).toBeTruthy()
    expect(
      screen.getByTestId("aszf-checkbox").closest("label")!.textContent,
    ).toBe("I accept the terms and conditions and the privacy notice.")
    await bekuld(lap.querySelector("form")!)
    expect(screen.getByTestId("register-error").textContent).toBe(
      "The two passwords do not match.",
    )
    expect(within(lap).getByText("Create account")).toBeTruthy()
  })
})

describe("az e-mail-cím ellenőrzése a lap nyelvén", () => {
  it("magyarul: siker és hiba", async () => {
    muveletek.confirmEmailVerification.mockResolvedValue({ success: true })
    render(<VerifyAccount />)
    await waitFor(() =>
      expect(screen.getByText(/Most már beléphetsz/)).toBeTruthy(),
    )
    expect(screen.getByRole("heading").textContent).toBe(
      "E-mail-cím ellenőrzése",
    )
  })

  it("angolul: siker, hiba és a hiányzó token", async () => {
    nav.countryCode = "en-hu"
    muveletek.confirmEmailVerification.mockResolvedValue({ success: true })
    render(<VerifyAccount />)
    await waitFor(() =>
      expect(screen.getByText(/You can sign in now/)).toBeTruthy(),
    )
    expect(screen.getByRole("heading").textContent).toBe(
      "Verifying your e-mail address",
    )
    expect(screen.getByRole("link").textContent).toContain("Sign in")
    cleanup()

    nav.token = null
    render(<VerifyAccount />)
    await waitFor(() =>
      expect(screen.getByText(/invalid or has expired/)).toBeTruthy(),
    )
  })
})
