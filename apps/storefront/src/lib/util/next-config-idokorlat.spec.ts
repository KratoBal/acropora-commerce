// @vitest-environment node
import { createRequire } from "node:module"
import { join } from "node:path"

import { afterEach, describe, expect, it, vi } from "vitest"

import { VARAKOZASOK_MS } from "./epites-ujraprobalas"

/*
  A LAP-GENERALAS IDOKORLATJA A BUILD KOZBENI UJRAPROBALAS KERETE FOLOTT
  (kartya 62811c0f, barracuda atvetele). A Next alapertelmezett 60 mp-e pont a
  burkolo varakozasainak osszege: hosszu kiesesnel a Next lone le a lapot a
  sajat hibajaval, mielott a burkolo megnevezve feladna.

  MI PIROSIT: a `staticPageGenerationTimeout` kikerul (akkor 60 mp az
  alapertelmezes), vagy valaki a burkolo keretet emeli a korlat fole.
*/
const GYOKER = join(__dirname, "..", "..", "..")
const betolt = createRequire(join(GYOKER, "package.json"))

afterEach(() => vi.unstubAllEnvs())

describe("staticPageGenerationTimeout", () => {
  it("bőven a build közbeni újrapróbálás kerete fölött áll", () => {
    vi.stubEnv(
      "NEXT_PUBLIC_MEDUSA_BACKEND_URL",
      "https://commerce-stage.example.test",
    )
    vi.stubEnv(
      "NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY",
      "pk_helyi_proba_nem_valodi",
    )
    const ut = betolt.resolve("./next.config.js")
    delete betolt.cache[ut]
    delete betolt.cache[betolt.resolve("./check-env-variables")]
    const { staticPageGenerationTimeout } = betolt(ut) as {
      staticPageGenerationTimeout?: number
    }
    const keret = VARAKOZASOK_MS.reduce((osszeg, ms) => osszeg + ms, 0) / 1000
    expect(staticPageGenerationTimeout).toBeDefined()
    // a varakozasok mellett a probak maguk is idot visznek: legalabb a duplaja
    expect(staticPageGenerationTimeout!).toBeGreaterThanOrEqual(keret * 2)
  })
})
