import { afterEach, describe, expect, it, vi } from "vitest"

import medusaError from "./medusa-error"

afterEach(() => {
  vi.restoreAllMocks()
})

function naplo() {
  const sorok: unknown[][] = []
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    sorok.push(args)
  })
  return sorok
}

/** A mai SDK alakja: `FetchError`, `status` mezővel, `response` NÉLKÜL. */
function sdkHiba(status: number, uzenet: string) {
  return Object.assign(new Error(uzenet), { status, statusText: "Bad Request" })
}

/**
 * A SEGÉD AZT AZ ALAKOT OLVASSA, AMIT AZ SDK TÉNYLEG DOB.
 *
 * === A MÉRT HIBA (860b273a) ===
 *
 * A segéd `err.response.status` alakot várt -- az a RÉGI, axios-alapú kliens
 * alakja. A mai `@medusajs/js-sdk` `FetchError`-t dob `status` mezővel és
 * `response` nélkül, tehát MINDEN hiba a harmadik, „nem is jött válasz" ágra
 * esett, és a diagnosztika soha nem futott le.
 *
 * A bizonyíték nem kódolvasás: a teszt kirakat naplójában ott állt a sor
 * (2026-09-14, digest 2352313220), és az „Error setting up the request:"
 * előtaggal kezdődött -- pontosan az `else` ág szövegével, egy sima 4xx
 * elutasításra.
 *
 * === AMIT EZ A SUITE MÉR, ÉS AMIT NEM ===
 *
 * MÉRI: melyik ág fut, mit ír a napló, és mit dob.
 *
 * NEM MÉRI: hogy a dobott üzenet eljut-e a vevőhöz. NEM jut el: ezek
 * szerver-műveletek, és ott a Next lecseréli a dobott hiba üzenetét. Az a másik
 * tétel (`31a50e97`), és ez a határ azért áll itt, hogy senki ne higgye: ezzel
 * a képernyőn is jobb lett.
 */
describe("a Medusa-hívások hibájának egységes alakja", () => {
  it("a mai SDK alakjából kiolvassa az állapotkódot, és naplózza", () => {
    const sorok = naplo()

    expect(() =>
      medusaError(sdkHiba(400, "the promotion code is invalid")),
    ).toThrow()

    const egyben = sorok.map((s) => s.join(" ")).join("\n")
    expect(egyben).toContain("400")
    expect(egyben).toContain("the promotion code is invalid")
  })

  /**
   * A MÁSIK IRÁNY, ÉS EZ AZ, AMIT acrobot KÜLÖN KÉRT: a RÉGI, `response`-os
   * alakból NEM szabad státuszt kiolvasni. Ha kiolvasna, azt hinnénk, hogy a
   * régi kliens valahol még él -- és a napló azt állítaná, hogy a szerver
   * válaszolt, holott a hiba alakja erről semmit nem mond.
   */
  it("a régi, response-os alakból NEM olvas státuszt", () => {
    const sorok = naplo()

    expect(() =>
      medusaError({ response: { status: 404, data: { message: "nincs" } } }),
    ).toThrow()

    const egyben = sorok.map((s) => s.join(" ")).join("\n")
    expect(egyben).toContain("válasz nélkül maradt")
    expect(egyben).not.toContain("404")
  })

  /**
   * A KÉT ÁG KÉT KÜLÖNBÖZŐ DOLGOT MOND, és ez nem szóhasználat: státusszal a
   * szerver VÁLASZOLT és elutasított; nélküle EL SEM JUTOTTUNK hozzá. Aki a
   * naplót olvassa, más teendőt kap a kettőtől.
   */
  it("a két ág üzenete különbözik", () => {
    naplo()
    let statusszal = ""
    let statuszNelkul = ""
    try {
      medusaError(sdkHiba(422, "hibás mező"))
    } catch (e) {
      statusszal = (e as Error).message
    }
    try {
      medusaError(new Error("fetch failed"))
    } catch (e) {
      statuszNelkul = (e as Error).message
    }

    expect(statusszal).not.toBe(statuszNelkul)
    expect(statuszNelkul).toContain("nem válaszolt")
  })

  /** A nagy kezdőbetű és a pont a régi viselkedés, és szándékosan marad. */
  it("az állapotkódos ág üzenete nagybetűvel kezdődik és ponttal zárul", () => {
    naplo()
    expect(() => medusaError(sdkHiba(400, "the code is invalid"))).toThrow(
      "The code is invalid.",
    )
  })

  /**
   * ISMERT POZITÍV KONTROLL a napló-állításokhoz: a segéd MINDIG dob. Enélkül
   * a fenti szeletek akkor is zöldek lennének, ha a függvény csendben
   * visszatérne -- és a hívók egy `undefined`-dal mennének tovább.
   */
  it("mindkét ágon dob, nem tér vissza csendben", () => {
    naplo()
    expect(() => medusaError(sdkHiba(500, "boom"))).toThrow()
    expect(() => medusaError("csak egy szöveg")).toThrow()
  })
})
