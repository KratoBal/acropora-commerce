// @vitest-environment node
import { afterEach, describe, expect, it, vi } from "vitest"
import { NextRequest } from "next/server"

import { POST } from "./route"

/**
 * A RUM VEGPONT (FE-7). MI PIROSIT: ha egy ervenytelen vagy tul nagy torzs is
 * naplo-sort irna; ha a sor URL-t vagy mas, nem ellenorzott mezot vinne.
 */
const keres = (torzs: string, fejlec: Record<string, string> = {}) =>
  new NextRequest("http://localhost/api/rum", {
    method: "POST",
    body: torzs,
    headers: { "content-type": "application/json", ...fejlec },
  })

afterEach(() => vi.restoreAllMocks())

/** Darabolt torzs `content-length` nelkul; a szamlalo mutatja, hany darabot olvastak ki. */
function daraboltKeres(darabszam: number, darabMeret: number) {
  let kiolvasva = 0
  const folyam = new ReadableStream<Uint8Array>({
    pull(vezerlo) {
      if (kiolvasva >= darabszam) return vezerlo.close()
      kiolvasva += 1
      vezerlo.enqueue(new Uint8Array(darabMeret).fill(0x61))
    },
  })
  const keres = new NextRequest("http://localhost/api/rum", {
    method: "POST",
    body: folyam,
    // a Node fetch a folyam-torzshoz ezt keri
    duplex: "half",
  } as ConstructorParameters<typeof NextRequest>[1])
  return { keres, kiolvasva: () => kiolvasva }
}

describe("POST /api/rum", () => {
  it("egy érvényes mérés 204, és egy JSON sor kerül a naplóba", async () => {
    const naplo = vi.spyOn(console, "log").mockImplementation(() => {})
    const valasz = await POST(
      keres(JSON.stringify({ n: "LCP", v: 2140, r: "good", t: "termek" })),
    )
    expect(valasz.status).toBe(204)
    expect(valasz.headers.get("cache-control")).toBe("no-store")
    expect(naplo).toHaveBeenCalledTimes(1)
    expect(JSON.parse(naplo.mock.calls[0]![0] as string)).toEqual({
      rum: 1,
      n: "LCP",
      v: 2140,
      r: "good",
      t: "termek",
    })
  })

  it("érvénytelen törzsre 400, és nincs naplósor", async () => {
    const naplo = vi.spyOn(console, "log").mockImplementation(() => {})
    for (const torzs of [
      "nem json",
      JSON.stringify({ n: "LCP", v: 1, r: "good", t: "termek", u: "/hu/x" }),
      JSON.stringify({ n: "LCP", v: 1, r: "good", t: "<script>" }),
    ])
      expect((await POST(keres(torzs))).status).toBe(400)
    expect(naplo).not.toHaveBeenCalled()
  })

  it("content-length nélkül a túl nagy törzset nem olvassa végig: 413", async () => {
    const naplo = vi.spyOn(console, "log").mockImplementation(() => {})
    const { keres: k, kiolvasva } = daraboltKeres(100, 300)
    expect(k.headers.get("content-length")).toBeNull()
    expect((await POST(k)).status).toBe(413)
    // 512 bajt felett megall: a 300 bajtos darabokbol legfeljebb harmat ker
    expect(kiolvasva()).toBeLessThanOrEqual(3)
    expect(naplo).not.toHaveBeenCalled()
  })

  it("a túl nagy törzs 413, a fejléc szerint és ténylegesen is", async () => {
    const naplo = vi.spyOn(console, "log").mockImplementation(() => {})
    const nagy = JSON.stringify({
      n: "LCP",
      v: 1,
      r: "good",
      t: "x".repeat(600),
    })
    expect((await POST(keres(nagy))).status).toBe(413)
    expect(
      (await POST(keres("{}", { "content-length": "100000" }))).status,
    ).toBe(413)
    expect(naplo).not.toHaveBeenCalled()
  })
})
