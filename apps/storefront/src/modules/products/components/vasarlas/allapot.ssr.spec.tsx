import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it, vi } from "vitest"

import { MennyisegDoboz } from "./dobozok"
import { kezdoOpciok, VasarlasProvider } from "./allapot"

/**
 * A KISZOLGALON RENDERELT LAP -- ES AMIERT EZ MASIK MEROHELY, NEM UJABB TESZT.
 *
 * === MI A MERT HIBA ===
 *
 * A valtozat kivalasztasa `useEffect`-ben tortent, tehat CSAK HIDRATALAS UTAN.
 * A kiszolgalt HTML-ben nem volt kivalasztott valtozat, es a `MennyisegDoboz`
 * ilyenkor a letiltott "Válassz változatot" gombot rajzolja -- olyan
 * termekeken is, ahol nincs mit valasztani.
 *
 * Merve a teszt bolton (2026-09-08): mind az 1492 termeknek PONTOSAN EGY
 * valtozata van. Es merve a kitelepitett lapon: a kiszolgalt HTML-ben a gomb
 * `disabled` volt, "Válassz változatot" felirattal, ket kulonbozo termeken.
 *
 * === MIERT NEM ELEG A JSDOM ===
 *
 * A `@testing-library/react` `render`-je LEFUTTATJA az effekteket. Egy
 * komponens-teszt tehat a javitas ELOTT is zoldet adott volna: nem azert, mert
 * nincs hiba, hanem mert az a merohely nem latja. Ez ugyanaz a csalad, mint
 * amikor egy allitas a halott agon ul.
 *
 * A `renderToStaticMarkup` NEM futtat effektet. Vagyis pontosan azt a
 * pillanatot meri, amit a vevo elsokent lat -- es amit egy kereso is lat.
 *
 * === AMIT EZ NEM MER ===
 *
 * Nem meri, hogy a bongeszo mit fest, es nem meri a hidratalas utani
 * allapotot. Arra a meglevo komponens-tesztek valok, es azok valtozatlanul
 * zoldek: a viselkedes hidratalas utan nem valtozott.
 */

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/products/proba",
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ replace: vi.fn() }),
}))

vi.mock("@lib/data/cart", () => ({
  addToCart: vi.fn(async () => undefined),
}))

/** Egy valtozat, egy opcio -- a teszt bolt mind az 1492 termeke ilyen. */
const EGY_VALTOZAT = {
  id: "prod_1",
  title: "Próba termék",
  handle: "proba",
  metadata: { unas_unit: "db" },
  options: [{ id: "opt_1", title: "Kivitel" }],
  variants: [
    {
      id: "var_1",
      title: "Alap",
      options: [{ option_id: "opt_1", value: "Alap" }],
      manage_inventory: false,
    },
  ],
} as never

/** KET valtozat: itt a valasztas VALODI, es a letiltott gomb HELYES. */
const KET_VALTOZAT = {
  ...(EGY_VALTOZAT as object),
  variants: [
    {
      id: "var_1",
      title: "Kicsi",
      options: [{ option_id: "opt_1", value: "Kicsi" }],
      manage_inventory: false,
    },
    {
      id: "var_2",
      title: "Nagy",
      options: [{ option_id: "opt_1", value: "Nagy" }],
      manage_inventory: false,
    },
  ],
} as never

describe("a kezdő opciók", () => {
  it("egyetlen változatnál a változat opcióit adja", () => {
    expect(kezdoOpciok(EGY_VALTOZAT)).toEqual({ opt_1: "Alap" })
  })

  /**
   * A TAGADO ESET NEM DISZ: enelkul egy fuggveny, ami MINDIG a variants[0]
   * opcioit adja, ugyanugy zold lenne -- es akkor ket valtozatnal a lap
   * onkenyesen valasztana a vevo helyett.
   */
  it("két változatnál üres, mert ott valóban választani kell", () => {
    expect(kezdoOpciok(KET_VALTOZAT)).toEqual({})
  })

  it("változat nélkül üres", () => {
    expect(kezdoOpciok({ variants: [] } as never)).toEqual({})
  })
})

describe("a kiszolgálón renderelt vásárlási doboz", () => {
  it("egyetlen változatnál NEM kéri a vevőt választásra", () => {
    const html = renderToStaticMarkup(
      <VasarlasProvider product={EGY_VALTOZAT}>
        <MennyisegDoboz />
      </VasarlasProvider>,
    )

    expect(html).not.toContain("Válassz változatot")
  })

  /**
   * A POZITIV KONTROLL, ES ENELKUL A FENTI ALLITAS SEMMIT NEM ER: egy
   * `not.toContain` akkor is teljesul, ha a doboz meg sem jelenik. Ez
   * bizonyitja, hogy a felirat MEG TUD jelenni ugyanezen az uton.
   */
  it("két változatnál viszont KÉRI, ugyanezen az úton", () => {
    const html = renderToStaticMarkup(
      <VasarlasProvider product={KET_VALTOZAT}>
        <MennyisegDoboz />
      </VasarlasProvider>,
    )

    expect(html).toContain("Válassz változatot")
  })
})
