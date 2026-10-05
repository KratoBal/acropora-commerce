import { describe, expect, it } from "vitest"

import {
  LINK_FIZETES_MOST_NEM_SIKERULT,
  linkHibaUzenet,
  linkVisszateresiCim,
  stripeVisszateresSikeres,
} from "./rendeles-fizetese"

/**
 * Ami pirosit: a hatter magyar 4xx mondata elveszik (a vevo nem tudja, mit
 * tegyen), vagy egy 5xx / halozati hiba belso szovege a vevo ele kerul; a
 * Stripe visszateresi parametereibol rossz dontes szuletik.
 */
describe("rendeles fizetese segedek", () => {
  it("a 4xx magyar mondata megy tovabb, minden mas a sajat mondatunk", () => {
    expect(linkHibaUzenet(409, "Ez a fizetési link lejárt.")).toBe(
      "Ez a fizetési link lejárt.",
    )
    expect(linkHibaUzenet(500, "Internal error at pg")).toBe(
      LINK_FIZETES_MOST_NEM_SIKERULT,
    )
    expect(linkHibaUzenet(undefined, "fetch failed")).toBe(
      LINK_FIZETES_MOST_NEM_SIKERULT,
    )
    expect(linkHibaUzenet(409, "  ")).toBe(LINK_FIZETES_MOST_NEM_SIKERULT)
  })

  it("a visszateresi cim a link sajat lapja", () => {
    expect(linkVisszateresiCim("https://shop.example.test", "hu", "a.b")).toBe(
      "https://shop.example.test/hu/rendeles-fizetese/a.b",
    )
  })

  it("a Stripe visszaterese: sikeres, sikertelen, vagy nem is visszateres", () => {
    expect(
      stripeVisszateresSikeres(
        new URLSearchParams("payment_intent=pi&redirect_status=succeeded"),
      ),
    ).toBe(true)
    expect(
      stripeVisszateresSikeres(
        new URLSearchParams("payment_intent=pi&redirect_status=failed"),
      ),
    ).toBe(false)
    expect(
      stripeVisszateresSikeres(
        new URLSearchParams("redirect_status=succeeded"),
      ),
    ).toBeNull()
    expect(stripeVisszateresSikeres(new URLSearchParams(""))).toBeNull()
  })
})
