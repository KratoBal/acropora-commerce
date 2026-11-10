import { describe, expect, it } from "vitest"

import { erkezesFeliratkozasKell, erkezoAllatokOf } from "./erkezo-allatok"

/*
  WHAT TURNS THIS RED (V2.6 S4c, the "Érkező állatok" list as the shop gives it, commerce #719). A row that is not exactly the
  contract shown (an unknown kind or state, a day that is not a real day, an empty name, a missing field) instead of left out;
  one bad row taking the others with it; the sign-up offered on a bound row, a group, a species that can be bought now, or
  without the switch.
*/
const sor = (felul: Record<string, unknown> = {}) => ({
  id: "lvarr_1",
  kind: "FISH",
  label: " Amphiprion ocellaris ",
  expected_on: "2026-11-20",
  status: "ORDERED",
  medusa_product_id: null,
  species_key: "amphiprion ocellaris",
  species_buyable: false,
  ...felul,
})

describe("erkezoAllatokOf", () => {
  it("EA-OLVAS: a szerzodes sorai, a nev levagva; minden rossz sor kimarad, a jo megmarad", () => {
    const lista = erkezoAllatokOf({
      livestock_arrivals: [
        sor(),
        sor({ id: "x-kind", kind: "PLANT" }),
        sor({ id: "x-status", status: "ARRIVED" }),
        sor({ id: "x-nap", expected_on: "2026-02-31" }),
        sor({ id: "x-ido", expected_on: "2026-11-20T10:00:00Z" }),
        sor({ id: "x-nev", label: "  " }),
        sor({ id: "x-buy", species_buyable: undefined }),
        sor({
          id: "lvarr_2",
          kind: "CORAL",
          label: "Zoanthus",
          species_key: null,
          medusa_product_id: "prod_1",
          status: "IN_TRANSIT",
        }),
        null,
        "szoveg",
      ],
    })
    expect(lista).toEqual([
      {
        id: "lvarr_1",
        fajta: "FISH",
        nev: "Amphiprion ocellaris",
        nap: "2026-11-20",
        allapot: "ORDERED",
        termekId: null,
        fajKulcs: "amphiprion ocellaris",
        fajKaphato: false,
      },
      {
        id: "lvarr_2",
        fajta: "CORAL",
        nev: "Zoanthus",
        nap: "2026-11-20",
        allapot: "IN_TRANSIT",
        termekId: "prod_1",
        fajKulcs: null,
        fajKaphato: false,
      },
    ])
    expect(erkezoAllatokOf(null)).toEqual([])
    expect(erkezoAllatokOf({ livestock_arrivals: "nem lista" })).toEqual([])
  })

  it("EA-FELIRATKOZAS: csak kotetlen, fajt nevezo, most nem kaphato fajra, es csak a kapcsoloval", () => {
    const [faj] = erkezoAllatokOf({ livestock_arrivals: [sor()] })
    expect(erkezesFeliratkozasKell(faj!, true)).toBe(true)
    expect(erkezesFeliratkozasKell(faj!, false)).toBe(false)
    expect(erkezesFeliratkozasKell({ ...faj!, termekId: "prod_1" }, true)).toBe(
      false,
    )
    expect(erkezesFeliratkozasKell({ ...faj!, fajKulcs: null }, true)).toBe(
      false,
    )
    expect(erkezesFeliratkozasKell({ ...faj!, fajKaphato: true }, true)).toBe(
      false,
    )
  })
})
