import { afterEach, describe, expect, it, vi } from "vitest"

import { uploadProblemPhoto } from "./problem-photo-upload"

/**
 * A KÉP FELTÖLTÉSE A BÖNGÉSZŐBŐL (kártya 2a7acb3b). MI PIROSÍT: ha a kép a szerver-műveleten át menne (nem a saját
 * útján); ha a 413 "nem elérhető"-nek, a 404/429 pedig általános hibának látszana a vevőnek; ha egy hálózati hiba
 * kivételként szivárogna az űrlapba.
 */
const input = {
  orderNumber: " 1042 ",
  email: " vevo@example.hu ",
  content: "QUJD",
}

afterEach(() => vi.unstubAllGlobals())

const valasz = (status: number, json?: unknown) =>
  vi
    .fn()
    .mockResolvedValue({ ok: status < 300, status, json: async () => json })

describe("uploadProblemPhoto", () => {
  it("posts the three fields to its own route and returns the photo id", async () => {
    const fetchMock = valasz(200, { photo_id: "img_1" })
    vi.stubGlobal("fetch", fetchMock)
    expect(await uploadProblemPhoto(input)).toEqual({
      ok: true,
      photoId: "img_1",
    })
    const [url, init] = fetchMock.mock.calls[0]!
    expect(url).toBe("/api/problem-photo")
    expect(JSON.parse(init.body)).toEqual({
      order_number: "1042",
      email: "vevo@example.hu",
      content: "QUJD",
    })
  })

  it("words the answers by the same table as the report: 404 not found, 429 too many, 400 and 413 invalid", async () => {
    for (const [status, failure] of [
      [404, "not_found"],
      [429, "too_many"],
      [400, "invalid"],
      [413, "invalid"],
      [502, "unavailable"],
    ] as const) {
      vi.stubGlobal("fetch", valasz(status))
      expect(await uploadProblemPhoto(input)).toEqual({ ok: false, failure })
    }
  })

  it("is unavailable for an answer without a photo id and for a network failure, and never throws", async () => {
    vi.stubGlobal("fetch", valasz(200, {}))
    expect(await uploadProblemPhoto(input)).toEqual({
      ok: false,
      failure: "unavailable",
    })
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("network")))
    expect(await uploadProblemPhoto(input)).toEqual({
      ok: false,
      failure: "unavailable",
    })
  })
})
