import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

// a `not-found` file gets no route params: the client reads them (inside `[countryCode]`) or the path (at the root)
const nav = vi.hoisted(() => ({
  params: {} as Record<string, string>,
  pathname: "/",
}))
vi.mock("next/navigation", () => ({
  useParams: () => nav.params,
  usePathname: () => nav.pathname,
}))

import NincsOldal from "./index"

const lap = (kosar = false) => render(<NincsOldal kosar={kosar} />)
const link = () => screen.getByRole("link").getAttribute("href")

afterEach(() => {
  cleanup()
  nav.params = {}
  nav.pathname = "/"
})

/**
 * THE "NO SUCH PAGE" BODY. WHAT TURNS IT RED: Hungarian text on an English
 * path; the home link leaving the page's language; an unknown first segment
 * being trusted as a language; the missing-cart sentence and the page sentence
 * swapping.
 */
describe("a nincs-ilyen-oldal törzs", () => {
  it("a magyar útvonalon magyar szöveg, a link a magyar főoldalra", () => {
    nav.params = { countryCode: "hu" }
    nav.pathname = "/hu/valami"
    lap()
    expect(screen.getByRole("heading").textContent).toBe("Nincs ilyen oldal")
    expect(screen.getByText("A keresett oldal nem található.")).toBeTruthy()
    expect(link()).toBe("/hu")
  })

  it("az angol útvonalon angol szöveg, a link az angol főoldalra", () => {
    nav.params = { countryCode: "en-hu" }
    nav.pathname = "/en-hu/valami"
    lap()
    expect(screen.getByRole("heading").textContent).toBe("Page not found")
    expect(
      screen.getByText("The page you are looking for does not exist."),
    ).toBeTruthy()
    expect(screen.getByText("Back to the home page")).toBeTruthy()
    expect(link()).toBe("/en-hu")
  })

  it("param nélkül (gyökér 404) az útvonal első szegmense dönt", () => {
    nav.pathname = "/en-hu/nincs-ilyen"
    lap()
    expect(screen.getByRole("heading").textContent).toBe("Page not found")
    expect(link()).toBe("/en-hu")
  })

  it("param nélkül egy ismeretlen első szegmens magyar, a link a gyökérre", () => {
    nav.pathname = "/zzz/akarmi"
    lap()
    expect(screen.getByRole("heading").textContent).toBe("Nincs ilyen oldal")
    expect(link()).toBe("/")
    cleanup()
    // an unknown language prefix is not a language: Hungarian, root link
    nav.pathname = "/de-hu/akarmi"
    lap()
    expect(screen.getByRole("heading").textContent).toBe("Nincs ilyen oldal")
    expect(link()).toBe("/")
  })

  it("a kosár mondata a két nyelven, és nem az oldalé", () => {
    nav.params = { countryCode: "hu" }
    lap(true)
    expect(
      screen.getByText(/A keresett kosár nem található\. Töröld/),
    ).toBeTruthy()
    expect(screen.queryByText("A keresett oldal nem található.")).toBeNull()
    cleanup()
    nav.params = { countryCode: "en-hu" }
    lap(true)
    expect(
      screen.getByText(/The cart you are looking for does not exist\. Clear/),
    ).toBeTruthy()
  })
})
