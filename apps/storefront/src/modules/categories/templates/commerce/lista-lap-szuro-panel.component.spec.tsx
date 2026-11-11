import { cleanup, render, screen, within } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/categories/korallok",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}))
vi.mock("@lib/data/cart", () => ({ addToCart: vi.fn() }))

import { translator } from "@lib/i18n/dictionary"
import {
  URES_TARTASI_SZURO,
  tartasiSorok,
  type TartasiSzuroValasz,
} from "@lib/util/tartasi-szuro"

import ListaLap, { type ListaLapProps } from "./lista-lap"
import TartasiSzuroSzakasz from "./tartasi-szuro-szakasz"

afterEach(cleanup)

/*
  A SZURO TELEFONON OSSZECSUKHATO (acrobot 46596). A teszt a szerkezetet es a szerzodest merei (a `small:` alatt a gomb mogott
  all, fölötte mindig latszik); a CSS-hatast jsdom nem szamolja, azt a PR-leiras valos bongeszos merese mondja.

  A TARTASI DARABSZAMOK A BOLT MOSTANI VALASZANAK ALAKJABAN VANNAK (`facets`: nehezseg, korallos, medence), CSAK SZAMOK: nem
  fajadat, nem kitalalt tartasi adat. A teszt boltban ma nincs ilyen adat; ez a fixture a szerkezet mereset szolgalja.
*/
const FACETS_FIXTURE: TartasiSzuroValasz = {
  product_ids: ["p1", "p2"],
  unchecked: 0,
  complete: true,
  facets: {
    difficulty: { KONNYU: 3, KOZEPES: 0, HALADO: 1, SZAKERTO: 0 },
    reef_safe: 2,
    tank: { "0-100": 1, "101-300": 2, "301-": 0 },
  },
}

const lapProps = (o: Partial<ListaLapProps> = {}): ListaLapProps => ({
  t: translator("hu"),
  morzsa: [{ id: "kat", nev: "Korallok" }],
  cim: "Korallok",
  eloAllat: true,
  sav: { osszes: true, elemek: [] },
  count: 0,
  page: 1,
  rendezes: null,
  szuroAktiv: false,
  szuroNyitva: false,
  torlesHref: "/hu/categories/korallok",
  keresoAction: "/hu/store",
  kategoriak: [],
  markaLista: [{ id: "m1", nev: "Teszt márka", szam: 2 }],
  markak: [],
  markaLink: (id) => `/hu/categories/korallok?marka=${id}`,
  tartasiSzakasz: (
    <TartasiSzuroSzakasz
      sorok={tartasiSorok(FACETS_FIXTURE, URES_TARTASI_SZURO)}
      link={(sor) => `/hu/categories/korallok?x=${sor.kulcs}`}
      t={translator("hu")}
    />
  ),
  products: [],
  eloAllatKartya: () => true,
  uresSzoveg: "nincs",
  kovetkezoHref: null,
  ...o,
})

const kapcsolo = () => screen.getByTestId("szurok-kapcsolo") as HTMLInputElement

describe("a szűrő doboz telefonon összecsukható", () => {
  it("a kapcsoló, a gomb és a tartalom egy szinten állnak, a tartalom a kapcsoló UTÁN (peer testvér)", () => {
    render(<ListaLap {...lapProps()} />)
    const doboz = screen.getByTestId("kategoria-szurok")
    const gomb = screen.getByTestId("szurok-gomb")
    const tartalom = screen.getByTestId("szurok-tartalom")
    expect(kapcsolo().parentElement).toBe(doboz)
    expect(gomb.parentElement).toBe(doboz)
    expect(tartalom.parentElement).toBe(doboz)
    // a peer-* szelektor csak a KOVETO testverekre hat: a gomb es a tartalom a kapcsolo utan all
    const gyerekek = Array.from(doboz.children)
    expect(gyerekek.indexOf(gomb)).toBeGreaterThan(gyerekek.indexOf(kapcsolo()))
    expect(gyerekek.indexOf(tartalom)).toBeGreaterThan(
      gyerekek.indexOf(kapcsolo()),
    )
    expect(kapcsolo().className).toContain("peer")
  })

  it("a gomb a kapcsoló cimkéje, a kapcsoló a tartalmat vezérli", () => {
    render(<ListaLap {...lapProps()} />)
    const gomb = screen.getByTestId("szurok-gomb")
    expect(gomb.tagName).toBe("LABEL")
    expect(gomb.getAttribute("for")).toBe(kapcsolo().id)
    expect(gomb.textContent).toBe("Szűrők")
    expect(kapcsolo().getAttribute("aria-controls")).toBe(
      screen.getByTestId("szurok-tartalom").id,
    )
    expect(screen.getByLabelText("Szűrők")).toBe(kapcsolo())
  })

  it("alapból zárva; aktív szűrőnél nyitva rajzolódik", () => {
    render(<ListaLap {...lapProps()} />)
    expect(kapcsolo().checked).toBe(false)
    cleanup()
    render(<ListaLap {...lapProps({ szuroAktiv: true, szuroNyitva: true })} />)
    expect(kapcsolo().checked).toBe(true)
  })

  it("csak-rendezés (szuroAktiv igaz, szuroNyitva hamis): a panel zárva, a Törlés link látszik", () => {
    render(<ListaLap {...lapProps({ szuroAktiv: true, szuroNyitva: false })} />)
    expect(kapcsolo().checked).toBe(false)
    expect(screen.getByRole("link", { name: "Törlés" })).toBeTruthy()
  })

  it("a tartalom a gomb mögött áll: a kereső, a márkák és a három tartási csoport (a fixture darabszámaival)", () => {
    render(<ListaLap {...lapProps()} />)
    const tartalom = within(screen.getByTestId("szurok-tartalom"))
    expect(tartalom.getByRole("searchbox")).toBeTruthy()
    expect(tartalom.getByTestId("szuro-markak")).toBeTruthy()
    for (const csoport of ["nehezseg", "korallos", "medence"])
      expect(tartalom.getByTestId(`szuro-tartas-${csoport}`)).toBeTruthy()
    // a nulla darabos ertek nem kap sort (mint a markaknal): csak KONNYU es HALADO, 0-100 es 101-300
    expect(
      within(tartalom.getByTestId("szuro-tartas-nehezseg")).getAllByRole(
        "link",
      ),
    ).toHaveLength(2)
    expect(
      within(tartalom.getByTestId("szuro-tartas-medence")).getAllByRole("link"),
    ).toHaveLength(2)
    // a fejlec es a gomb NEM a tartalomban van: zarva is latszanak
    expect(tartalom.queryByTestId("szurok-gomb")).toBeNull()
    expect(tartalom.queryByRole("heading", { level: 2 })).toBeNull()
  })

  it("a törlés link zárt panelnél is a fejlécben látszik, nem a tartalomban", () => {
    render(<ListaLap {...lapProps({ szuroAktiv: true })} />)
    const torles = screen.getByRole("link", { name: "Törlés" })
    expect(screen.getByTestId("szurok-tartalom").contains(torles)).toBe(false)
  })

  it("a szerződés a `small` (1024) felett: a tartalom mindig látszik, a gomb és a kapcsoló nem létezik", () => {
    render(<ListaLap {...lapProps()} />)
    expect(screen.getByTestId("szurok-tartalom").className).toMatch(
      /\bhidden\b.*\bpeer-checked:flex\b.*\bsmall:flex\b/,
    )
    expect(screen.getByTestId("szurok-gomb").className).toContain(
      "small:hidden",
    )
    expect(kapcsolo().className).toContain("small:hidden")
  })

  it("angolul a gomb 'Filters'", () => {
    render(<ListaLap {...lapProps({ t: translator("en") })} />)
    expect(screen.getByTestId("szurok-gomb").textContent).toBe("Filters")
  })

  it("szűrő oszlop nélküli lista (szuro=false): nincs doboz, nincs kapcsoló", () => {
    render(<ListaLap {...lapProps({ szuro: false })} />)
    expect(screen.queryByTestId("kategoria-szurok")).toBeNull()
    expect(screen.queryByTestId("szurok-kapcsolo")).toBeNull()
  })
})
