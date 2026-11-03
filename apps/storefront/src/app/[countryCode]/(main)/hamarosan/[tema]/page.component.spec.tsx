import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const nav = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND")
  }),
}))
vi.mock("next/navigation", () => ({
  notFound: nav.notFound,
  useParams: () => ({ countryCode: "hu" }),
}))

import HamarosanLap, { generateMetadata } from "./page"

const props = (countryCode: string, tema: string) => ({
  params: Promise.resolve({ countryCode, tema }),
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

/**
 * A HAMAROSAN LAP A LAP NYELVEN. MI PIROSIT: ha az angol uton magyar szoveg
 * marad; ha a magyar ut szovege elmozdul; ha egy ismeretlen tema nem 404; ha a
 * fulcim a lap nyelvu "Hamarosan" utotagja helyett magyart ad.
 */
describe("a Hamarosan lap", () => {
  it("magyarul: a régi szöveg és a magyar címke", async () => {
    render(await HamarosanLap(props("hu", "tudastar")))
    expect(screen.getByTestId("hamarosan-lap").textContent).toContain(
      "Hamarosan",
    )
    expect(screen.getByRole("heading").textContent).toBe("Tudástár")
    expect(screen.getByText("Ez az oldal még készül.")).toBeTruthy()
    expect(screen.getByText("Vissza a főoldalra")).toBeTruthy()
    expect((await generateMetadata(props("hu", "tudastar"))).title).toBe(
      "Tudástár · Hamarosan",
    )
  })

  it("angolul: angol cím, szöveg, link és fülcím", async () => {
    render(await HamarosanLap(props("en-hu", "tudastar")))
    expect(screen.getByRole("heading").textContent).toBe("Knowledge base")
    expect(screen.getByText("Coming soon")).toBeTruthy()
    expect(screen.getByText("This page is still being built.")).toBeTruthy()
    expect(screen.getByText("Back to the home page")).toBeTruthy()
    expect((await generateMetadata(props("en-hu", "tudastar"))).title).toBe(
      "Knowledge base · Coming soon",
    )
  })

  it("a kategória-név témánál az angol úton is a bolt neve áll", async () => {
    render(await HamarosanLap(props("en-hu", "korallok")))
    expect(screen.getByRole("heading").textContent).toBe("Korallok")
  })

  it("ismeretlen téma: 404, és a fülcím is 404", async () => {
    await expect(HamarosanLap(props("en-hu", "nincs-ilyen"))).rejects.toThrow(
      "NEXT_NOT_FOUND",
    )
    expect((await generateMetadata(props("en-hu", "nincs-ilyen"))).title).toBe(
      "404",
    )
  })
})
