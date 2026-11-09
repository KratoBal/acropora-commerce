import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

let orszag = "hu"
vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: orszag }),
}))
/** A lap cime: a komponens a bongeszobol olvassa a tokent. */
const cim = (kereses: string) =>
  window.history.replaceState(null, "", `/hu/hirlevel/x${kereses}`)
const hirlevelLinkKuldes = vi.fn()
vi.mock("@lib/data/hirlevel", () => ({
  hirlevelLinkKuldes: (...args: unknown[]) => hirlevelLinkKuldes(...args),
}))

import HirlevelLinkUrlap from "./hirlevel-link-urlap"

/*
  A HIRLEVEL-LINK LAPJANAK URLAPJA (d707cf5f). MI PIROSIT: a token a lap
  betoltesekor a bolthoz megy (egy levelszkenner igy megerositene); a gomb mas
  fajtat vagy mas tokent kuld; egy kesz valasz utan a gomb ott marad; egy hiba
  utan eltunik (ujra kell tudni probalni); token nelkul gomb jelenik meg; az
  angol lapon magyar szoveg.
*/
const TOKEN = "A".repeat(42) + "_"

afterEach(() => {
  cleanup()
  hirlevelLinkKuldes.mockReset()
  cim("")
  orszag = "hu"
})

describe("HirlevelLinkUrlap", () => {
  it("HLU-KATTINTAS: betolteskor semmi nem megy a bolthoz, a gomb a lap fajtajat es a cim tokenjet kuldi", async () => {
    cim(`?token=${TOKEN}`)
    hirlevelLinkKuldes.mockResolvedValue({ allapot: "megerositve" })
    render(<HirlevelLinkUrlap fajta="megerosites" />)
    expect(hirlevelLinkKuldes).not.toHaveBeenCalled()
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Megerősítem a feliratkozást" }),
      )
    })
    expect(hirlevelLinkKuldes).toHaveBeenCalledWith("megerosites", TOKEN)
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toBe(
        "Köszönjük, a feliratkozásod megerősítve.",
      ),
    )
    // a kesz valasz utan nincs gomb
    expect(screen.queryByRole("button")).toBeNull()
  })

  it("HLU-LEIRATKOZAS: a leiratkozo lap a sajat fajtajat kuldi, es a valaszt mondja ki", async () => {
    cim(`?token=${TOKEN}`)
    hirlevelLinkKuldes.mockResolvedValue({ allapot: "leiratkozva" })
    render(<HirlevelLinkUrlap fajta="leiratkozas" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Leiratkozom" }))
    })
    expect(hirlevelLinkKuldes).toHaveBeenCalledWith("leiratkozas", TOKEN)
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toContain(
        "Leiratkoztál",
      ),
    )
  })

  it("HLU-HIBA: egy hiba utan a gomb marad, ujra lehet probalni; a lejart link a lejart uzenetet adja", async () => {
    cim(`?token=${TOKEN}`)
    hirlevelLinkKuldes.mockResolvedValueOnce({ allapot: "hiba", ok: "korlat" })
    hirlevelLinkKuldes.mockResolvedValueOnce({ allapot: "lejart" })
    render(<HirlevelLinkUrlap fajta="megerosites" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toContain(
        "túl sok kérés",
      ),
    )
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toContain(
        "lejárt",
      ),
    )
    expect(hirlevelLinkKuldes).toHaveBeenCalledTimes(2)
  })

  it("HLU-NINCS-TOKEN: token nelkul nincs gomb, a lap az ervenytelen linket mondja", () => {
    render(<HirlevelLinkUrlap fajta="megerosites" />)
    expect(hirlevelLinkKuldes).not.toHaveBeenCalled()
    expect(screen.queryByRole("button")).toBeNull()
    expect(screen.getByTestId("hirlevel-link-allapot").textContent).toContain(
      "nem érvényes",
    )
  })

  it("HLU-ANGOL: az angol lapon angolul", async () => {
    orszag = "en-hu"
    cim(`?token=${TOKEN}`)
    hirlevelLinkKuldes.mockResolvedValue({ allapot: "ervenytelen" })
    render(<HirlevelLinkUrlap fajta="leiratkozas" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Unsubscribe" }))
    })
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toContain(
        "This link is not valid",
      ),
    )
  })
})
