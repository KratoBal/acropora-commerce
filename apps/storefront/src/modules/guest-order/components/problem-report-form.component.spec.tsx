import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const uploadProblemPhoto = vi.fn()
const submitProblemReport = vi.fn()
vi.mock("@lib/data/problem-report", () => ({
  uploadProblemPhoto: (...args: unknown[]) => uploadProblemPhoto(...args),
  submitProblemReport: (...args: unknown[]) => submitProblemReport(...args),
}))

import type { GuestOrder } from "@lib/util/guest-order"

import ProblemReportForm from "./problem-report-form"

afterEach(() => {
  cleanup()
  uploadProblemPhoto.mockReset()
  submitProblemReport.mockReset()
})

/*
  WHAT TURNS THIS RED (V1.2, the form). The server asked before the form is complete; the photos not uploaded
  BEFORE the report, or the report not naming them; the order's own number and the address not used; the typed text
  lost on a failure (the page says it is kept); a lockout shown as the generic error; a wrong file accepted into the
  list, a sixth photo accepted; the live animal note on a non-animal reason; a success without the case reference.
*/
const order: GuestOrder = {
  display_id: 1043,
  created_at: null,
  total: 1000,
  currency_code: "huf",
  payment_status: null,
  business_status: null,
  items: [
    { id: "item_1", title: "Korall A", quantity: 1, total: 500 },
    { id: "item_2", title: "Korall B", quantity: 2, total: 500 },
  ],
  shipping: {
    method_name: "Bolti átvétel",
    pickup_point: null,
    store_pickup: true,
  },
  tracking: null,
}

const jpeg = (name = "a.jpg", size = 8) =>
  new File([new Uint8Array(size).fill(0xff)], name, { type: "image/jpeg" })

function fillValid(kind = "item_damaged") {
  fireEvent.click(screen.getByLabelText(/Korall A/))
  fireEvent.change(screen.getByLabelText("Mi a probléma?"), {
    target: { value: kind },
  })
  fireEvent.change(screen.getByLabelText("Mi történt pontosan?"), {
    target: { value: " Törött a láb " },
  })
}
const addFile = (file: File) =>
  fireEvent.change(screen.getByTestId("problem-file-input"), {
    target: { files: [file] },
  })
const submit = async () => {
  await act(async () => {
    fireEvent.submit(screen.getByTestId("problem-form-1043"))
  })
}
const renderForm = (onClose = vi.fn()) =>
  render(
    <ProblemReportForm
      order={order}
      email="vevo@example.hu"
      onClose={onClose}
    />,
  )

beforeEach(() => {
  uploadProblemPhoto.mockResolvedValue({ ok: true, photoId: "img_1" })
  submitProblemReport.mockResolvedValue({
    ok: true,
    reportId: "ordprb_01ABC",
    createdAt: "2026-11-04T10:00:00.000Z",
  })
})

describe("the problem report form", () => {
  it("does not ask the server for an incomplete form, and names every missing part", async () => {
    renderForm()
    await submit()
    expect(submitProblemReport).not.toHaveBeenCalled()
    expect(uploadProblemPhoto).not.toHaveBeenCalled()
    expect(screen.getByTestId("problem-items-error").textContent).toBe(
      "Jelöld meg legalább egy terméket.",
    )
    expect(screen.getByTestId("problem-kind-error").textContent).toBe(
      "Válaszd ki, mi a probléma.",
    )
    expect(screen.getByTestId("problem-description-error").textContent).toBe(
      "Írd le röviden, mi történt.",
    )
  })

  it("uploads the photos first, then files the report with the order's own number, the address and the photo ids", async () => {
    uploadProblemPhoto
      .mockResolvedValueOnce({ ok: true, photoId: "img_1" })
      .mockResolvedValueOnce({ ok: true, photoId: "img_2" })
    renderForm()
    fillValid()
    fireEvent.click(screen.getByLabelText(/Korall B/))
    fireEvent.change(screen.getByLabelText("Telefonszám (nem kötelező)"), {
      target: { value: " +36 30 123 4567 " },
    })
    addFile(jpeg("elso.jpg"))
    addFile(jpeg("masodik.jpg"))
    await submit()
    await waitFor(() => expect(submitProblemReport).toHaveBeenCalledTimes(1))
    expect(uploadProblemPhoto).toHaveBeenCalledTimes(2)
    expect(uploadProblemPhoto.mock.calls[0][0]).toMatchObject({
      orderNumber: "1043",
      email: "vevo@example.hu",
    })
    // the content is the file's own bytes as base64 (eight 0xff bytes), without any data: prefix
    expect(uploadProblemPhoto.mock.calls[0][0].content).toBe(
      btoa("\u00ff".repeat(8)),
    )
    expect(submitProblemReport.mock.calls[0][0]).toMatchObject({
      orderNumber: "1043",
      email: "vevo@example.hu",
      kind: "item_damaged",
      itemIds: ["item_1", "item_2"],
      description: "Törött a láb",
      phone: " +36 30 123 4567 ",
      photoIds: ["img_1", "img_2"],
    })
    // the upload finished before the report was sent
    expect(uploadProblemPhoto.mock.invocationCallOrder[1]).toBeLessThan(
      submitProblemReport.mock.invocationCallOrder[0]!,
    )
  })

  it("a form with a reason but no item or description is still not sent", async () => {
    renderForm()
    fireEvent.change(screen.getByLabelText("Mi a probléma?"), {
      target: { value: "other" },
    })
    await submit()
    expect(submitProblemReport).not.toHaveBeenCalled()
    expect(screen.getByTestId("problem-items-error")).toBeTruthy()
    expect(screen.getByTestId("problem-description-error")).toBeTruthy()
    expect(screen.queryByTestId("problem-kind-error")).toBeNull()
  })

  it("a success shows the case reference and a close button", async () => {
    const onClose = vi.fn()
    renderForm(onClose)
    fillValid()
    await submit()
    const done = await screen.findByTestId("problem-done")
    expect(done.textContent).toContain("Az ügy azonosítója: ordprb_01ABC.")
    expect(done.textContent).toContain("[KITÖLTENDŐ: válaszidő]")
    fireEvent.click(screen.getByText("Bezárás"))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("a failure keeps everything typed and says so; the form stays", async () => {
    submitProblemReport.mockResolvedValue({ ok: false, failure: "unavailable" })
    renderForm()
    fillValid()
    await submit()
    const failure = await screen.findByTestId("problem-failure")
    expect(failure.textContent).toContain("A beírt adataid megmaradtak")
    expect(
      (screen.getByLabelText("Mi történt pontosan?") as HTMLTextAreaElement)
        .value,
    ).toBe(" Törött a láb ")
    expect(
      (screen.getByLabelText(/Korall A/) as HTMLInputElement).checked,
    ).toBe(true)
  })

  it("a lockout is not worded as the generic failure", async () => {
    submitProblemReport.mockResolvedValue({ ok: false, failure: "too_many" })
    renderForm()
    fillValid()
    await submit()
    expect(
      (await screen.findByTestId("problem-failure")).textContent,
    ).toContain("Túl sok sikertelen próbálkozás")
  })

  it("a photo that cannot be uploaded stops the filing and names the file; no report is sent", async () => {
    uploadProblemPhoto.mockResolvedValue({ ok: false, failure: "invalid" })
    renderForm()
    fillValid()
    addFile(jpeg("rossz.jpg"))
    await submit()
    expect((await screen.findByTestId("problem-failure")).textContent).toBe(
      "A(z) rossz.jpg képet nem tudtuk feltölteni.",
    )
    expect(submitProblemReport).not.toHaveBeenCalled()
  })

  it("refuses a wrong file type and a file over the limit with their own notes, and keeps them out of the list", () => {
    renderForm()
    addFile(new File(["x"], "a.gif", { type: "image/gif" }))
    expect(screen.getByTestId("problem-photo-note").textContent).toContain(
      "JPG vagy PNG",
    )
    addFile(jpeg("nagy.jpg", 5 * 1024 * 1024 + 1))
    expect(screen.getByTestId("problem-photo-note").textContent).toContain(
      "túl nagy",
    )
    expect(screen.getByTestId("problem-files").children).toHaveLength(0)
  })

  it("takes at most five photos, and a photo can be removed again", () => {
    renderForm()
    for (let i = 0; i < 5; i++) addFile(jpeg(`k${i}.jpg`))
    expect(screen.getByTestId("problem-files").children).toHaveLength(5)
    addFile(jpeg("hatodik.jpg"))
    expect(screen.getByTestId("problem-photo-note").textContent).toContain(
      "Legfeljebb 5 képet",
    )
    expect(screen.getByTestId("problem-files").children).toHaveLength(5)
    fireEvent.click(screen.getAllByText("Eltávolítás")[0]!)
    expect(screen.getByTestId("problem-files").children).toHaveLength(4)
  })

  it("the live animal note shows for the animal reasons only", () => {
    renderForm()
    expect(screen.queryByTestId("problem-live-note")).toBeNull()
    fireEvent.change(screen.getByLabelText("Mi a probléma?"), {
      target: { value: "animal_dead" },
    })
    expect(screen.getByTestId("problem-live-note").textContent).toContain(
      "[KITÖLTENDŐ: pontos jelzési határidő",
    )
    fireEvent.change(screen.getByLabelText("Mi a probléma?"), {
      target: { value: "item_damaged" },
    })
    expect(screen.queryByTestId("problem-live-note")).toBeNull()
  })
})
