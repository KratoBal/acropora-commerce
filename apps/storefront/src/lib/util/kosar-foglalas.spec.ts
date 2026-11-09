import { describe, expect, it } from "vitest"

import { translator } from "@lib/i18n/dictionary"
import {
  RENDELES_DARAB_FOGLALT,
  rendelesHibaKod,
  rendelesHibaUzenet,
} from "@lib/util/penztar-uzenet"

import {
  foglalasElutasitas,
  foglalasValaszbol,
  kosarbaElutasitasMondat,
  masKosaraban,
  oraPerc,
  percMulva,
  sajatFoglalasok,
} from "./kosar-foglalas"

/**
 * A KOSARFOGLALAS A KIRAKATON (V2.3 S2b). MI PIROSIT: egy hibas alaku valasz vagy uzenet tovabbmegy;
 * a sajat foglalas idegennek latszik a lapon; a lejart idegen foglalas meg tiltja a gombot; a perc
 * lefele kerekit (0 perc); az ora nem budapesti; a harom elutasitas egymasba vagy a mai mondatba olvad;
 * a leadasnal a foglalt darab nem a sajat mondatat kapja.
 */
const MOST = new Date("2026-11-09T16:00:00.000Z")
const KESOBB = (perc: number) =>
  new Date(MOST.getTime() + perc * 60_000).toISOString()
const hu = translator("hu")

describe("a bolt valasza", () => {
  it("ervenyes alakot atenged, hibasat nem", () => {
    const jo = {
      on: true,
      pieces: [
        {
          variant_id: "v1",
          unique: true,
          hold: { until: KESOBB(12), mine: false },
        },
        { variant_id: "v2", unique: false, hold: null },
      ],
    }
    expect(foglalasValaszbol(jo)).toEqual(jo)
    expect(foglalasValaszbol({ on: false, pieces: [] })).toEqual({
      on: false,
      pieces: [],
    })
    for (const rossz of [
      null,
      { pieces: [] },
      { on: true, pieces: [{ variant_id: 1, unique: true, hold: null }] },
      {
        on: true,
        pieces: [
          {
            variant_id: "v1",
            unique: true,
            hold: { until: "tegnap", mine: false },
          },
        ],
      },
      {
        on: true,
        pieces: [
          { variant_id: "v1", unique: true, hold: { until: KESOBB(1) } },
        ],
      },
    ])
      expect(foglalasValaszbol(rossz)).toBeNull()
  })

  it("a lap csak a MASIK kosar allo foglalasat latja", () => {
    const valasz = (hold: unknown) =>
      foglalasValaszbol({
        on: true,
        pieces: [{ variant_id: "v1", unique: true, hold }],
      })
    expect(
      masKosaraban(valasz({ until: KESOBB(12), mine: false }), "v1", MOST),
    ).toEqual({
      until: new Date(KESOBB(12)),
    })
    expect(
      masKosaraban(valasz({ until: KESOBB(12), mine: true }), "v1", MOST),
    ).toBeNull()
    expect(
      masKosaraban(valasz({ until: KESOBB(-1), mine: false }), "v1", MOST),
    ).toBeNull()
    expect(masKosaraban(valasz(null), "v1", MOST)).toBeNull()
    expect(masKosaraban(null, "v1", MOST)).toBeNull()
  })

  it("a kosar a sajat foglalasait latja, lejarttal egyutt; mast es nem egyedit nem", () => {
    const valasz = foglalasValaszbol({
      on: true,
      pieces: [
        {
          variant_id: "v1",
          unique: true,
          hold: { until: KESOBB(20), mine: true },
        },
        {
          variant_id: "v2",
          unique: true,
          hold: { until: KESOBB(-5), mine: true },
        },
        {
          variant_id: "v3",
          unique: true,
          hold: { until: KESOBB(20), mine: false },
        },
        { variant_id: "v4", unique: false, hold: null },
      ],
    })
    const sajat = sajatFoglalasok(valasz, MOST)
    expect(Array.from(sajat.keys())).toEqual(["v1", "v2"])
    expect(sajat.get("v1")?.lejart).toBe(false)
    expect(sajat.get("v2")?.lejart).toBe(true)
    expect(
      sajatFoglalasok(foglalasValaszbol({ on: false, pieces: [] }), MOST).size,
    ).toBe(0)
  })
})

describe("ido es perc", () => {
  it("a perc felfele kerekit, legalabb 1", () => {
    expect(percMulva(new Date(KESOBB(11.2)), MOST)).toBe(12)
    expect(percMulva(new Date(KESOBB(0.1)), MOST)).toBe(1)
    expect(percMulva(new Date(KESOBB(-3)), MOST)).toBe(1)
  })

  it("az ora budapesti, telen es nyaron", () => {
    expect(oraPerc(new Date("2026-11-09T16:30:00.000Z"))).toBe("17:30")
    expect(oraPerc(new Date("2026-07-09T16:30:00.000Z"))).toBe("18:30")
  })
})

describe("a bolt harom elutasitasa", () => {
  const foglalt = (until: string) =>
    `unique_piece_held:${JSON.stringify([{ title: "Acropora", handle: "acropora", until }])}`

  it("mindharom a sajat mondatat kapja", () => {
    expect(kosarbaElutasitasMondat(foglalt(KESOBB(12)), hu, MOST)).toBe(
      hu("product.holdHeldByOther", { perc: 12 }),
    )
    expect(kosarbaElutasitasMondat('cart_hold_limit:{"max":5}', hu, MOST)).toBe(
      hu("product.holdLimit", { max: 5 }),
    )
    expect(
      kosarbaElutasitasMondat(
        'unique_piece_busy:[{"title":"A","handle":"a"}]',
        hu,
        MOST,
      ),
    ).toBe(hu("product.holdBusy"))
    expect(kosarbaElutasitasMondat(foglalt(KESOBB(-1)), hu, MOST)).toBe(
      hu("product.holdHeldByOtherNoTime"),
    )
  })

  it("mas hiba, vagy hibas alak: nem az ove (a hivo a mai mondatot adja)", () => {
    for (const uzenet of [
      "Variant does not have the required inventory",
      "unique_piece_sold:[]",
      "unique_piece_held:nem-json",
      "unique_piece_held:[]",
      'cart_hold_limit:{"max":0}',
      'cart_hold_limit:{"max":"5"}',
      "unique_piece_busy:{}",
    ])
      expect(foglalasElutasitas(uzenet)).toBeNull()
  })

  it("a leadasnal a foglalt darab a sajat mondatat kapja, a kulccsal egyutt", () => {
    const hiba = new Error(foglalt(KESOBB(12)))
    expect(rendelesHibaUzenet(hiba)).toBe(RENDELES_DARAB_FOGLALT)
    expect(rendelesHibaKod(hiba)).toBe("checkoutPayment.errPieceHeld")
    expect(hu("checkoutPayment.errPieceHeld")).toBe(RENDELES_DARAB_FOGLALT)
  })
})
