import { describe, expect, it } from "vitest"

import { SZURO_KULCSOK } from "../../../belso-utvonalak"
import { szuroLink, szuroLinkRel } from "./szuro-link"

/**
 * A SZURT LAPRA MUTATO LINK FELISMERESE (FE-4b). MI PIROSIT: ha egy szuro-kulcs
 * (a `_szurt` atirast kivalto lista) linkje kovetheto marad; ha a szuro
 * levetele, a sima lapozo vagy a valtozat-link `nofollow`-t kap.
 */
describe("szűrt lapra mutató link", () => {
  it("minden szűrő-kulcs nofollow, relatív és teljes úton is", () => {
    // pozitiv kontroll: a lista nem ures, tehat a ciklus tenyleg mer
    expect(SZURO_KULCSOK.length).toBeGreaterThanOrEqual(5)
    for (const kulcs of SZURO_KULCSOK) {
      expect(szuroLinkRel(`?${kulcs}=x`), kulcs).toBe("nofollow")
      expect(
        szuroLinkRel(`/hu/categories/a?page=2&${kulcs}=x#lista`),
        kulcs,
      ).toBe("nofollow")
    }
  })

  it("a levétel, a lapozó, a változat és a horgony követhető", () => {
    for (const href of [
      "?",
      "/hu/categories/a",
      "?page=2",
      "/hu/termek/h?v_id=variant_01M1NKD0MAH36C3YMC0QX64NZB",
      "/hu/categories/a#marka=x",
    ])
      expect(szuroLink(href), href).toBe(false)
  })
})
