// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

const fetchMock = vi.fn()
vi.mock("@lib/config", () => ({
  sdk: { client: { fetch: (...a: unknown[]) => fetchMock(...a) } },
}))

import { PROBLEM_PHOTO_MAX_BODY_BYTES } from "@lib/util/problem-photo-upload"
import { FOTO_KORLAT } from "@lib/util/vendeg-korlat"

import { POST } from "./route"

/**
 * A KÉP-FELTÖLTŐ ÚT (V1.2, kártya 2a7acb3b: a törzskorlát a saját útján, nem a szerver-műveletek 8 MB-ján).
 * MI PIROSÍT: ha idegen eredetű vagy eredet nélküli kérés átmegy; ha a határ fölötti törzs beolvasódik vagy
 * továbbmegy a backendnek (content-length-tel vagy anélkül); ha a backend hibájának állapotkódja elvész vagy a
 * rendelés-hiány a naplóba kerül; ha a backendnek más megy, mint a három ismert mező.
 */
const body = (extra: Record<string, unknown> = {}) =>
  JSON.stringify({
    order_number: " #01042 ",
    email: " vevo@example.hu ",
    content: "QUJD",
    ...extra,
  })

const keres = (torzs: BodyInit | null, fejlec: Record<string, string> = {}) =>
  new NextRequest("https://shop.example.hu/api/problem-photo", {
    method: "POST",
    body: torzs,
    headers: {
      "content-type": "application/json",
      host: "shop.example.hu",
      origin: "https://shop.example.hu",
      ...fejlec,
    },
  })

beforeEach(() => {
  fetchMock.mockResolvedValue({ photo_id: "img_1" })
})
afterEach(() => {
  fetchMock.mockReset()
  vi.restoreAllMocks()
})

describe("POST /api/problem-photo", () => {
  it("passes the three fields to the backend (trimmed) and answers the photo id", async () => {
    const valasz = await POST(keres(body()))
    expect(valasz.status).toBe(200)
    expect(await valasz.json()).toEqual({ photo_id: "img_1" })
    expect(fetchMock).toHaveBeenCalledWith(
      "/store/guest-orders/problem-photos",
      expect.objectContaining({
        method: "POST",
        body: {
          order_number: "#01042",
          email: "vevo@example.hu",
          content: "QUJD",
        },
      }),
    )
  })

  it("sends the backend nothing but the three known fields", async () => {
    await POST(keres(body({ extra: "x", report_id: "r" })))
    expect(Object.keys(fetchMock.mock.calls[0]![1].body).sort()).toEqual([
      "content",
      "email",
      "order_number",
    ])
  })

  it("refuses a request from another origin, or with none, before reading anything", async () => {
    for (const fejlec of [
      { origin: "https://evil.example" },
      { origin: "" },
      { origin: "nem url" },
    ]) {
      const valasz = await POST(keres(body(), fejlec))
      expect(valasz.status).toBe(403)
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("takes the forwarded host as the own host behind a proxy", async () => {
    const valasz = await POST(
      keres(body(), {
        host: "10.0.0.5:8000",
        "x-forwarded-host": "shop.example.hu",
      }),
    )
    expect(valasz.status).toBe(200)
  })

  it("takes the first entry of a forwarded host list, ignores the case and the default port (barracuda, #668 review)", async () => {
    for (const fejlec of <Record<string, string>[]>[
      {
        host: "10.0.0.5:8000",
        "x-forwarded-host": "shop.example.hu, proxy.internal",
      },
      { host: "10.0.0.5:8000", "x-forwarded-host": "SHOP.example.hu" },
      { host: "10.0.0.5:8000", "x-forwarded-host": "shop.example.hu:443" },
      { host: "shop.example.hu:443" },
    ]) {
      const valasz = await POST(keres(body(), fejlec))
      expect(valasz.status).toBe(200)
    }
  })

  it("still refuses a list whose first entry is another host, and a non-default port that differs", async () => {
    for (const fejlec of [
      {
        host: "10.0.0.5:8000",
        "x-forwarded-host": "evil.example, shop.example.hu",
      },
      { host: "10.0.0.5:8000", "x-forwarded-host": "shop.example.hu:8443" },
    ]) {
      expect((await POST(keres(body(), fejlec))).status).toBe(403)
    }
  })

  it("is 413 over the limit by the content-length, and the backend is not called", async () => {
    const valasz = await POST(
      keres(body(), {
        "content-length": String(PROBLEM_PHOTO_MAX_BODY_BYTES + 1),
      }),
    )
    expect(valasz.status).toBe(413)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("is 413 over the limit without a content-length, and stops reading at the limit", async () => {
    let kiolvasva = 0
    const darab = 1_000_000
    const folyam = new ReadableStream<Uint8Array>({
      pull(vezerlo) {
        kiolvasva += 1
        if (kiolvasva > 50) return vezerlo.close()
        vezerlo.enqueue(new Uint8Array(darab).fill(0x61))
      },
    })
    const kerelem = new NextRequest(
      "https://shop.example.hu/api/problem-photo",
      {
        method: "POST",
        body: folyam,
        duplex: "half",
        headers: { host: "shop.example.hu", origin: "https://shop.example.hu" },
      } as ConstructorParameters<typeof NextRequest>[1],
    )
    const valasz = await POST(kerelem)
    expect(valasz.status).toBe(413)
    // the limit is 7.1 MB: it does not read the stream to its 50 MB end
    expect(kiolvasva).toBeLessThan(15)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("accepts a body right at the limit", async () => {
    const tartalom = "A".repeat(PROBLEM_PHOTO_MAX_BODY_BYTES - 200)
    const valasz = await POST(keres(body({ content: tartalom })))
    expect(valasz.status).toBe(200)
  })

  it("is 400 for a body that is not JSON or lacks one of the three strings", async () => {
    for (const torzs of [
      "nem json",
      JSON.stringify({ order_number: "1", email: "a@b.hu" }),
      JSON.stringify([1]),
    ])
      expect((await POST(keres(torzs))).status).toBe(400)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it("gives the backend's 4xx back as it is, so the page can word it, and keeps the not-found out of the log", async () => {
    const naplo = vi.spyOn(console, "error").mockImplementation(() => undefined)
    for (const allapot of [400, 404, 429]) {
      fetchMock.mockRejectedValueOnce(
        Object.assign(new Error("x"), { status: allapot }),
      )
      expect((await POST(keres(body()))).status).toBe(allapot)
    }
    // the 404 is the lookup's one answer for every miss: it is not logged
    expect(naplo).toHaveBeenCalledTimes(2)
  })

  it("is 502 for a backend failure without a client status, and for an answer without a photo id", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined)
    fetchMock.mockRejectedValueOnce(new Error("boom"))
    expect((await POST(keres(body()))).status).toBe(502)
    fetchMock.mockRejectedValueOnce(
      Object.assign(new Error("x"), { status: 503 }),
    )
    expect((await POST(keres(body()))).status).toBe(502)
    fetchMock.mockResolvedValueOnce({})
    expect((await POST(keres(body()))).status).toBe(502)
  })

  describe("the per-visitor limit (x-real-ip)", () => {
    it("is 429 over the limit, before the body is read and without asking the backend; another visitor is not affected", async () => {
      for (let i = 0; i < FOTO_KORLAT.max; i += 1)
        expect(
          (await POST(keres(body(), { "x-real-ip": "203.0.113.41" }))).status,
        ).toBe(200)
      fetchMock.mockClear()
      const tul = await POST(keres(body(), { "x-real-ip": "203.0.113.41" }))
      expect(tul.status).toBe(429)
      expect(fetchMock).not.toHaveBeenCalled()
      expect(
        (await POST(keres(body(), { "x-real-ip": "203.0.113.42" }))).status,
      ).toBe(200)
    })

    it("a foreign origin is still 403 first, and it does not spend the visitor's allowance", async () => {
      for (let i = 0; i < FOTO_KORLAT.max + 5; i += 1)
        expect(
          (
            await POST(
              keres(body(), {
                "x-real-ip": "203.0.113.43",
                origin: "https://masik.example.hu",
              }),
            )
          ).status,
        ).toBe(403)
      expect(
        (await POST(keres(body(), { "x-real-ip": "203.0.113.43" }))).status,
      ).toBe(200)
    })

    it("does not limit a request without the header (no shared key)", async () => {
      for (let i = 0; i < FOTO_KORLAT.max + 10; i += 1)
        expect((await POST(keres(body()))).status).toBe(200)
    })
  })
})
