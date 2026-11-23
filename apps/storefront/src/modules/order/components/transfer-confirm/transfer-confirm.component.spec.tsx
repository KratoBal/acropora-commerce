import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

const adat = vi.hoisted(() => ({
  elfogad: vi.fn(),
  elutasit: vi.fn(),
}))
vi.mock("@lib/data/orders", () => ({
  acceptTransferRequest: adat.elfogad,
  declineTransferRequest: adat.elutasit,
}))

import TransferConfirm from "./index"

/**
 * A MEGEROSITES EGY GOMBNYOMASRA MEGY (kartya b9912381). Ami pirosit: a komponens a RENDERELESKOR hivja az atvitelt; a gomb nem a kapott id-vel es tokennel hivja a
 * megfelelo akciot (az elfogadas gombja az elutasitast hivja, vagy forditva); a siker- es a hibaallapot nem jelenik meg; egy hiba utan nem lehet ujra probalni; egy
 * folyamatban levo hivas alatt a gomb ujra elsulhet.
 */
describe("TransferConfirm", () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it("renderelesre nem hiv semmit, a gomb a megfelelo felirattal all", () => {
    render(<TransferConfirm id="order_1" token="tok_1" mode="accept" />)
    expect(adat.elfogad).not.toHaveBeenCalled()
    expect(adat.elutasit).not.toHaveBeenCalled()
    expect(screen.getByTestId("transfer-gomb")).toHaveTextContent(
      "Átvétel elfogadása",
    )
    cleanup()
    render(<TransferConfirm id="order_1" token="tok_1" mode="decline" />)
    expect(screen.getByTestId("transfer-gomb")).toHaveTextContent(
      "Átvétel elutasítása",
    )
  })

  it("az elfogadas gombja CSAK az elfogadast hivja, a kapott id-vel es tokennel, es a siker szoveget mutatja", async () => {
    adat.elfogad.mockResolvedValue({ success: true, error: null })
    render(<TransferConfirm id="order_1" token="tok_1" mode="accept" />)
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    await waitFor(() =>
      expect(screen.getByTestId("transfer-kesz")).toBeInTheDocument(),
    )
    expect(adat.elfogad).toHaveBeenCalledTimes(1)
    expect(adat.elfogad).toHaveBeenCalledWith("order_1", "tok_1")
    expect(adat.elutasit).not.toHaveBeenCalled()
    expect(screen.getByText(/A rendelés átkerült\./)).toBeInTheDocument()
    expect(screen.queryByTestId("transfer-gomb")).toBeNull()
  })

  it("az elutasitas gombja CSAK az elutasitast hivja, es a siker szoveget mutatja", async () => {
    adat.elutasit.mockResolvedValue({ success: true, error: null })
    render(<TransferConfirm id="order_1" token="tok_1" mode="decline" />)
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    await waitFor(() =>
      expect(screen.getByTestId("transfer-kesz")).toBeInTheDocument(),
    )
    expect(adat.elutasit).toHaveBeenCalledWith("order_1", "tok_1")
    expect(adat.elfogad).not.toHaveBeenCalled()
    expect(screen.getByText(/Az átadást elutasítottad\./)).toBeInTheDocument()
  })

  it("hiba utan a hiba latszik, es a gomb ujra megnyomhato", async () => {
    adat.elfogad
      .mockResolvedValueOnce({ success: false, error: "lejart token" })
      .mockResolvedValueOnce({ success: true, error: null })
    render(<TransferConfirm id="order_1" token="tok_1" mode="accept" />)
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    await waitFor(() =>
      expect(
        screen.getByText(/Az átadás elfogadása nem sikerült/),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText(/Hibaüzenet: lejart token/)).toBeInTheDocument()
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    await waitFor(() =>
      expect(screen.getByTestId("transfer-kesz")).toBeInTheDocument(),
    )
    expect(adat.elfogad).toHaveBeenCalledTimes(2)
  })

  it("ha maga a szerver-akcio hivasa dob (halozati hiba), a vevo hibat lat, es ujra probalhatja", async () => {
    adat.elfogad
      .mockRejectedValueOnce(new Error("Failed to fetch"))
      .mockResolvedValueOnce({ success: true, error: null })
    render(<TransferConfirm id="order_1" token="tok_1" mode="accept" />)
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    await waitFor(() =>
      expect(
        screen.getByText(/Az átadás elfogadása nem sikerült/),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText(/Nem kaptunk választ/)).toBeInTheDocument()
    expect(screen.getByTestId("transfer-gomb")).not.toBeDisabled()
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    await waitFor(() =>
      expect(screen.getByTestId("transfer-kesz")).toBeInTheDocument(),
    )
    expect(adat.elfogad).toHaveBeenCalledTimes(2)
  })

  it("folyamatban levo hivas alatt a masodik kattintas nem hiv ujra", async () => {
    let tovabb!: (v: { success: boolean; error: null }) => void
    adat.elfogad.mockReturnValue(
      new Promise((res) => {
        tovabb = res
      }),
    )
    render(<TransferConfirm id="order_1" token="tok_1" mode="accept" />)
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    fireEvent.click(screen.getByTestId("transfer-gomb"))
    expect(adat.elfogad).toHaveBeenCalledTimes(1)
    tovabb({ success: true, error: null })
    await waitFor(() =>
      expect(screen.getByTestId("transfer-kesz")).toBeInTheDocument(),
    )
  })
})
