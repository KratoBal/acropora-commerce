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
const szoljLinkKuldes = vi.fn()
vi.mock("@lib/data/szolj-hasonlo", () => ({
  szoljLinkKuldes: (...args: unknown[]) => szoljLinkKuldes(...args),
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
  szoljLinkKuldes.mockReset()
  cim("")
  orszag = "hu"
})

describe("HirlevelLinkUrlap", () => {
  /*
    A TOKEN A KESZ VALASZ UTAN KIKERUL A CIMBOL (barracuda, d707cf5f). MI PIROSIT: a megerosites vagy a leiratkozas
    utan a token a cimben marad; egy hiba utan kikerul (akkor ujra kell tudni probalni); a tobbi parameter vagy a
    Next router allapota elveszik.
  */
  it("HLU-TOKEN-KI: kész válasz után a token nélküli cím, a többi paraméter és az előzmény-állapot marad", async () => {
    for (const [fajta, allapot] of [
      ["megerosites", "megerositve"],
      ["leiratkozas", "leiratkozva"],
      ["megerosites", "lejart"],
    ] as const) {
      window.history.replaceState(
        { __NA: true, kulcs: 1 },
        "",
        `/hu/hirlevel/x?utm_source=level&token=${TOKEN}#fent`,
      )
      hirlevelLinkKuldes.mockResolvedValue({ allapot })
      render(<HirlevelLinkUrlap fajta={fajta} />)
      await act(async () => {
        fireEvent.click(await screen.findByRole("button"))
      })
      await waitFor(() =>
        expect(window.location.search).toBe("?utm_source=level"),
      )
      expect(window.location.pathname).toBe("/hu/hirlevel/x")
      expect(window.location.hash).toBe("#fent")
      expect(window.history.state).toEqual({ __NA: true, kulcs: 1 })
      cleanup()
    }
  })

  it("HLU-TOKEN-MARAD: hiba után a token a címben marad", async () => {
    cim(`?token=${TOKEN}`)
    hirlevelLinkKuldes.mockResolvedValue({ allapot: "hiba", ok: "hiba" })
    render(<HirlevelLinkUrlap fajta="megerosites" />)
    await act(async () => {
      fireEvent.click(await screen.findByRole("button"))
    })
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot")).toBeTruthy(),
    )
    expect(window.location.search).toBe(`?token=${TOKEN}`)
  })

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

  /*
    A "SZÓLJ, HA JÖN HASONLÓ" ERTESITES KET LINKJE (V2.4) UGYANEZT A LAPOT HASZNALJA. MI PIROSIT: az ertesites
    tokenje a hirlevel boltbeli utjara megy (ott ervenytelen, vagy rosszabb: egy hirlevel-sort erosit meg), vagy
    a lap a hirlevel szovegeit mondja.
  */
  it("HLU-ERTESITES: az ertesites lapja a sajat akciojat hivja, a hirlevelet nem, es a sajat szovegeit mondja", async () => {
    cim(`?token=${TOKEN}`)
    szoljLinkKuldes.mockResolvedValueOnce({ allapot: "lejart" })
    szoljLinkKuldes.mockResolvedValueOnce({ allapot: "megerositve" })
    render(<HirlevelLinkUrlap fajta="megerosites" tema="ertesites" />)
    await act(async () => {
      fireEvent.click(
        screen.getByRole("button", { name: "Megerősítem az értesítés-kérést" }),
      )
    })
    expect(szoljLinkKuldes).toHaveBeenCalledWith("megerosites", TOKEN)
    expect(hirlevelLinkKuldes).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toContain(
        "a termék lapján",
      ),
    )
    // a lejart utan nincs gomb (kesz valasz), tehat ujra renderelve probaljuk a megerositest; a kesz valasz a tokent
    // kivette a cimbol (HLU-TOKEN-KI), ezert a link ujra megnyitva all
    cleanup()
    cim(`?token=${TOKEN}`)
    render(<HirlevelLinkUrlap fajta="megerosites" tema="ertesites" />)
    await act(async () => {
      fireEvent.click(screen.getByRole("button"))
    })
    await waitFor(() =>
      expect(screen.getByTestId("hirlevel-link-allapot").textContent).toBe(
        "Köszönjük, az értesítés-kérésed megerősítve.",
      ),
    )
  })
})
