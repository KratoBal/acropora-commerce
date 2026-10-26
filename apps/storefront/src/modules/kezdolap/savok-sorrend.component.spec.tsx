import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

/* a savok maguk nem itt vizsgaltak: jelolo elem, hogy a sorrend es a lathatosag latszon */
const { jelolo } = vi.hoisted(() => ({
  jelolo: (nev: string) => ({
    default: () => <i data-sav={nev} />,
  }),
}))
vi.mock("@modules/kezdolap/components/hero-csuszka", () => jelolo("hero"))
vi.mock("@modules/kezdolap/components/mit-keresel", () => jelolo("mit-keresel"))
vi.mock("@modules/kezdolap/components/kezdo-es-halado", () =>
  jelolo("kezdo-es-halado"),
)
vi.mock("@modules/kezdolap/components/egyedi-korallok", () =>
  jelolo("egyedi-korallok"),
)
vi.mock("@modules/kezdolap/components/szolgaltatasok", () =>
  jelolo("szolgaltatasok"),
)
vi.mock("@modules/kezdolap/components/markak", () => jelolo("markak"))
vi.mock("@modules/kezdolap/components/velemenyek", () => jelolo("velemenyek"))
vi.mock("@modules/kezdolap/components/boltunk", () => jelolo("boltunk"))

import { BLOKK_KULCSOK } from "./blokkok"
import { KezdolapSavok } from "./savok"
import type { KezdolapTartalom } from "./tartalom"

/*
  A KEZDOLAP SAVJAI A REKORDBOL. MI PIROSIT: ha a `blocks` nelkuli rekord nem a
  terv sorrendjet mutatja minden savval; ha a sorrend vagy a lathatosag nem
  kovetkezik a listabol; ha egy sav gyokerelemen hianyzik a
  `data-homepage-block` jelolo (az elo elonezet kattintasa erre epul); ha a
  jelolo nem azonos a sav kulcsaval.
*/
async function savok(tartalom: KezdolapTartalom | null) {
  const { container } = render(
    await KezdolapSavok({ tartalom, countryCode: "hu" }),
  )
  return Array.from(
    container.querySelectorAll<HTMLElement>("[data-homepage-block]"),
  ).map((e) => ({
    blokk: e.dataset.homepageBlock,
    sav: e.querySelector<HTMLElement>("[data-sav]")?.dataset.sav,
  }))
}

const rekord = (blocks: KezdolapTartalom["blocks"]): KezdolapTartalom => ({
  texts: {},
  slides: null,
  blocks,
})

describe("a kezdőlap sávjai", () => {
  afterEach(cleanup)

  it("rekord nélkül és blocks nélkül a terv sorrendje, mind a nyolc sáv", async () => {
    for (const t of [null, rekord(undefined), rekord(null)]) {
      const ki = await savok(t)
      cleanup()
      expect(ki.map((k) => k.blokk)).toEqual([...BLOKK_KULCSOK])
      expect(ki.every((k) => k.blokk === k.sav)).toBe(true)
    }
  })

  it("a lista sorrendje és a rejtett blokk a lapon is megjelenik", async () => {
    const blocks = [...BLOKK_KULCSOK]
      .reverse()
      .map((key) => ({ key, visible: key !== "velemenyek" }))
    const ki = await savok(rekord(blocks))
    expect(ki.map((k) => k.blokk)).toEqual(
      [...BLOKK_KULCSOK].reverse().filter((k) => k !== "velemenyek"),
    )
    expect(ki.every((k) => k.blokk === k.sav)).toBe(true)
  })

  it("sérült lista esetén a terv sorrendje áll", async () => {
    const ki = await savok(rekord([{ key: "hero", visible: false }]))
    expect(ki.map((k) => k.blokk)).toEqual([...BLOKK_KULCSOK])
  })
})
