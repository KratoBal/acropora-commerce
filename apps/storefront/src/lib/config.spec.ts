import { afterEach, describe, expect, it, vi } from "vitest"

/**
 * AZ SDK BURKOLOJA BUILD KOZBEN UJRAPROBAL (kartya 62811c0f).
 *
 * MI PIROSIT: ha az `sdk.store.*` hivasok NEM a felulirt `sdk.client.fetch`-en
 * mennenek at (akkor a lapok adatanak egy resze ujraprobalas nelkul maradna);
 * ha a burkolo futasidoben is ujraprobalna.
 */

const valasz = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    statusText: status === 502 ? "Bad Gateway" : "OK",
    headers: { "content-type": "application/json" },
  })

async function sdkFreshen() {
  vi.resetModules()
  return (await import("./config")).sdk
}

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe("sdk.client.fetch burkolója", () => {
  it("build közben az sdk.store hívás egy 502 után újrapróbál", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-build")
    vi.spyOn(console, "error").mockImplementation(() => {})
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(valasz(502, { message: "Bad Gateway" }))
      .mockResolvedValueOnce(valasz(200, { collections: [], count: 0 }))
    vi.stubGlobal("fetch", fetchMock)
    vi.useFakeTimers()
    const sdk = await sdkFreshen()

    const eredmeny = sdk.store.collection.list({ fields: "id,handle" })
    await vi.advanceTimersByTimeAsync(2_000)

    await expect(eredmeny).resolves.toMatchObject({ collections: [] })
    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]![0])).toContain("/store/collections")
  })

  it("futásidőben ugyanez a 502 egyszer hív, és azonnal bukik", async () => {
    vi.stubEnv("NEXT_PHASE", "phase-production-server")
    const fetchMock = vi
      .fn()
      .mockResolvedValue(valasz(502, { message: "Bad Gateway" }))
    vi.stubGlobal("fetch", fetchMock)
    const sdk = await sdkFreshen()

    await expect(sdk.store.collection.list()).rejects.toMatchObject({
      status: 502,
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })
})
