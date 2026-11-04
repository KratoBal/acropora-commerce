import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/guest-order/components/guest-order-form", () => ({
  default: () => <div data-testid="form-stub" />,
}))

import Page, { metadata } from "./page"

afterEach(cleanup)

/*
  WHAT TURNS THIS RED (V1.1). The page indexable (a customer's own order lookup in a search engine); the
  heading or the intro missing; the English page in Hungarian.
*/
describe("the guest order page", () => {
  it("is kept out of search engines", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false })
  })

  it("draws the heading, the intro and the form (Hungarian)", async () => {
    render(await Page({ params: Promise.resolve({ countryCode: "hu" }) }))
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "Rendelés megtekintése",
    )
    expect(screen.getByTestId("rendeles-megtekintese").textContent).toContain(
      "Add meg a rendelésszámot",
    )
    expect(screen.getByTestId("form-stub")).toBeTruthy()
  })

  it("draws the English heading on the English page", async () => {
    render(await Page({ params: Promise.resolve({ countryCode: "en-hu" }) }))
    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe(
      "View your order",
    )
  })
})
