import { cleanup, render, screen, waitFor } from "@testing-library/react"
import { fireEvent } from "@testing-library/dom"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

let orszagKod = "hu"
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszagKod }),
}))
vi.mock("@lib/data/csomagpont", () => ({
  searchFoxpostPickupPoints: vi.fn(),
  searchGlsPickupPoints: vi.fn(),
}))

import FoxpostValaszto from "../foxpost-valaszto"
import GlsValaszto from "../gls-valaszto"
import CsomagpontValaszto, { listaSzovegek } from "./index"
import { translator } from "@lib/i18n/dictionary"

afterEach(cleanup)
beforeEach(() => {
  orszagKod = "hu"
})

/**
 * A CSOMAGPONT-VÁLASZTÓK SZÖVEGEI A LAP NYELVÉN. A kereső (térkép) a
 * szolgáltatóé és a saját nyelvén marad; a mi keretünk, a lista és az állapot-
 * mondatok a lapé. A GLS és a Foxpost márkaneve nem fordul.
 */
describe("a csomagpont-választó nyelve", () => {
  it("angolul a lista keresője, a gombja és a nincs-találat mondata angol", async () => {
    orszagKod = "en-hu"
    render(
      <CsomagpontValaszto
        szolgaltato="GLS"
        kereso={async () => ({ elerheto: true, pontok: [], talalat: 0 })}
        onValaszt={() => {}}
      />,
    )
    expect(screen.getByText(/Choose which GLS pickup point/)).toBeTruthy()
    expect(screen.getByText("Postal code or city")).toBeTruthy()
    fireEvent.change(screen.getByTestId("csomagpont-kereses"), {
      target: { value: "2100" },
    })
    fireEvent.click(screen.getByTestId("csomagpont-kereses-gomb"))
    await waitFor(() =>
      expect(screen.getByTestId("csomagpont-nincs").textContent).toBe(
        "No result for this search.",
      ),
    )
  })

  it("magyarul ugyanez a régi mondatokkal", () => {
    render(
      <CsomagpontValaszto
        szolgaltato="GLS"
        kereso={async () => ({ elerheto: true, pontok: [], talalat: 0 })}
        onValaszt={() => {}}
      />,
    )
    expect(
      screen.getByText("Válaszd ki, melyik GLS csomagpontba kéred a csomagot."),
    ).toBeTruthy()
  })

  it("a tartalék lista mondatai a szolgáltató nevével, nyelvenként", () => {
    expect(listaSzovegek(translator("hu"), "FOXPOST").hiba).toBe(
      "Nem sikerült betölteni a FOXPOST pontokat.",
    )
    expect(listaSzovegek(translator("en"), "GLS").hiba).toBe(
      "Could not load the GLS points.",
    )
  })

  it("a Foxpost és a GLS választó fejléce és bevezetője angolul", () => {
    orszagKod = "en-hu"
    const { unmount } = render(
      <FoxpostValaszto kivalasztott={null} onValaszt={() => {}} />,
    )
    expect(screen.getByText("Choose a pickup point")).toBeTruthy()
    expect(
      screen.getByText(/The official FOXPOST map finder opens/),
    ).toBeTruthy()
    unmount()
    render(
      <GlsValaszto
        optionId="so-gls"
        nehez
        kivalasztott={null}
        onValaszt={() => {}}
      />,
    )
    expect(
      screen.getByText(
        "The official GLS map finder. Heavy goods are sent to a GLS ParcelShop.",
      ),
    ).toBeTruthy()
    expect(screen.getByText("Search in a list")).toBeTruthy()
  })
})
