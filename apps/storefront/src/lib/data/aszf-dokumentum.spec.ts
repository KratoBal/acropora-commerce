import { createHash } from "node:crypto"

import { describe, expect, it, vi } from "vitest"

import { ASZF_FORRAS } from "@lib/util/aszf"

import { aszfDokumentumMost, FOGYASZTOBARAT_REFERER } from "./aszf-dokumentum"

/**
 * AMIT A VEVO AZ ELFOGADASKOR KAPOTT (kartya 4a2b252d). MI PIROSIT:
 * - kikapcsolt Fogyasztobaratnal lekeres indul, vagy nem a mai bolt ASZF-je jon;
 * - bekapcsolva a szerver nem a sajat bolti domainunk Referer-evel kerdez (akkor
 *   a Fogyasztobarat 1002-t ad, es a lenyomat a hibauzenete lenne);
 * - a lenyomat nem a valasz bajtjaie, vagy a hatalydatum nem a szovegbol jon;
 * - hibakodra, nem-200-ra vagy halozati hibara kitalalt lenyomat jon, vagy dobas.
 */
const DOKUMENTUM =
  '<h1>ÁLTALÁNOS SZERZŐDÉSI FELTÉTELEK (ÁSZF)</h1><p><span class="inserted_var">bolt.example</span> - hatályos ettől a naptól: <span class="inserted_var">2026-10-05</span></p><p>Szöveg.</p>'

const valasz = (szoveg: string, status = 200) =>
  new Response(new TextEncoder().encode(szoveg), { status })

describe("az ÁSZF, ahogy a vevő kapta", () => {
  it("kikapcsolva a mai bolt ÁSZF-je, lekérés nélkül", async () => {
    const lekeres = vi.fn()
    expect(await aszfDokumentumMost(false, lekeres)).toEqual({
      tipus: "mai-bolt",
    })
    expect(lekeres).not.toHaveBeenCalled()
  })

  it("bekapcsolva a forrást a saját bolti domainünkkel kéri, a hatálydátum és a bájtok lenyomata jön", async () => {
    const lekeres = vi.fn(async () => valasz(DOKUMENTUM))
    const eredmeny = await aszfDokumentumMost(true, lekeres as never)
    expect(eredmeny).toEqual({
      tipus: "fogyasztobarat",
      hatalyos: "2026-10-05",
      lenyomat: `sha256:${createHash("sha256").update(DOKUMENTUM, "utf8").digest("hex")}`,
    })
    const [cim, beallitas] = lekeres.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ]
    expect(cim).toBe(ASZF_FORRAS)
    expect((beallitas.headers as Record<string, string>).Referer).toBe(
      FOGYASZTOBARAT_REFERER,
    )
    expect(FOGYASZTOBARAT_REFERER).toBe("https://shop.acropora.hu/")
  })

  it("hibakódra, nem-200-ra és hálózati hibára nincs lenyomat, és nem dob", async () => {
    const nincs = { tipus: "fogyasztobarat", hatalyos: null, lenyomat: null }
    expect(
      await aszfDokumentumMost(true, (async () =>
        valasz("<p>Hibakód: 1002</p>")) as never),
    ).toEqual(nincs)
    expect(
      await aszfDokumentumMost(true, (async () =>
        valasz(DOKUMENTUM, 503)) as never),
    ).toEqual(nincs)
    expect(
      await aszfDokumentumMost(true, (async () => {
        throw new Error("időtúllépés")
      }) as never),
    ).toEqual(nincs)
  })
})
