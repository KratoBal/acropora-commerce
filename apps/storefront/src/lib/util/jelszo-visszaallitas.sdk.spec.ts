import Medusa from "@medusajs/js-sdk"
import { afterEach, describe, expect, it, vi } from "vitest"

import {
  JELSZO_KERES_UT,
  jelszoKeresBeallitas,
} from "@lib/util/jelszo-visszaallitas"

/*
  MI PIROSIT (kartya 7bfca4eb): a kirakat a bolt SIKERES kerését hibanak latja. A Medusa `reset-password` utja `201 Created`-et ad szoveges
  torzzsel; a js-sdk alapbol JSON-t var, es a szoveges torzset `SyntaxError`-ral dobja el. Merve a teszt kirakaton 2026-11-24 (az oldal
  "Nem sikerult"-et mondott, a bolt elfogadta a kerest); a tiszta logika tesztje ezt nem fogta meg, mert a bolt hivasat kicserelte. Ez a
  teszt a VALODI SDK-t futtatja, a halozatot cserelve: ugyanaz a hivas, amit az akcio indit.
*/
const keres = (valasz: () => Response) => {
  const fetchStub = vi.fn(async () => valasz())
  vi.stubGlobal("fetch", fetchStub)
  const sdk = new Medusa({
    baseUrl: "https://bolt.example.test",
    publishableKey: "pk_teszt",
  })
  return { sdk, fetchStub }
}
afterEach(() => vi.unstubAllGlobals())

const torzs = { identifier: "vevo@example.hu", metadata: { locale: "hu" } }
const created = () =>
  new Response("Created", {
    status: 201,
    headers: { "content-type": "text/plain; charset=utf-8" },
  })

describe("a jelszó-visszaállítás kérése a valódi SDK-val", () => {
  it("a bolt szöveges 201-ét (törzs: Created) SIKERKÉNT kapja, és a kérés törzse a cím és a nyelv", async () => {
    const { sdk, fetchStub } = keres(created)
    await expect(
      sdk.client.fetch(JELSZO_KERES_UT, jelszoKeresBeallitas(torzs)),
    ).resolves.toBeDefined()
    const [url, init] = fetchStub.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(String(url)).toBe(
      "https://bolt.example.test/auth/customer/emailpass/reset-password",
    )
    expect(init.method).toBe("POST")
    expect(JSON.parse(String(init.body))).toEqual(torzs)
    expect(new Headers(init.headers).get("accept")).toBe("*/*")
    expect(new Headers(init.headers).get("content-type")).toContain(
      "application/json",
    )
  })

  it("a kontroll: a fejlec nélküli régi hívás ugyanezt a sikeres választ hibaként dobja (ezért van a fejléc)", async () => {
    const { sdk } = keres(created)
    await expect(
      sdk.client.fetch(JELSZO_KERES_UT, {
        method: "POST",
        body: torzs,
        cache: "no-store",
      }),
    ).rejects.toBeInstanceOf(SyntaxError)
  })

  it("a bolt hibás válasza (429) továbbra is hiba, a státusszal", async () => {
    const { sdk } = keres(
      () =>
        new Response(JSON.stringify({ message: "Too many attempts" }), {
          status: 429,
          headers: { "content-type": "application/json" },
        }),
    )
    await expect(
      sdk.client.fetch(JELSZO_KERES_UT, jelszoKeresBeallitas(torzs)),
    ).rejects.toMatchObject({ status: 429 })
  })
})
