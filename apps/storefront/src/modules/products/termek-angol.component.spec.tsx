import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "en-hu" }),
  usePathname: () => "/en-hu/termek/x",
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}))
vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({
    children,
    href,
    ...rest
  }: {
    children: React.ReactNode
    href: string
  }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
}))

import { translator } from "@lib/i18n/dictionary"
import ProductPrice from "./components/product-price"
import {
  kosarbaTehetoMennyiseg,
  orderQuantityHint,
} from "./components/product-actions/minimum-order-quantity"
import StockState from "./components/stock-state"
import UniquePieceBadge, {
  UniquePiecePromise,
} from "./components/unique-piece-badge"
import { VazDoboz, MUSZAKI_LAP_SZAKASZAI } from "./components/lap-vaz"
import {
  ArAlattiSor,
  DoaGarancia,
  KiszerelesSor,
  OmnibusSor,
} from "./components/vasarlas/dobozok"
import { TermekTudasBlokk } from "./templates/muszaki-lap/termek-tudas"
import { kosarUzenet } from "@lib/util/kosar-uzenet"
import { galeriaAlt } from "./components/image-gallery/kep-alt"

/**
 * A TERMEKLAP SZOVEGEI ANGOLUL (kirakat-i18n-kezdolap-termeklap). MI PIROSIT: ha az angol lap egy felirata, jelvenye, gombja,
 * cime vagy varakozo szovege magyar marad; ha a magyar valtozat barmiben mas, mint volt (a magyar mondatok betu szerint itt allnak);
 * ha az "-tol" szo angolul a ar utan marad ("from" elol kell); ha a lap nyelve nem jut el a szerveroldali dobozokig.
 */
afterEach(cleanup)

const MAGYAR_BETU = /[áéíóöőúüűÁÉÍÓÖŐÚÜŰ]/
const hu = translator("hu")
const en = translator("en")

const arral = (osszeg: number) => ({
  calculated_price: {
    calculated_amount: osszeg,
    original_amount: osszeg,
    currency_code: "huf",
    calculated_price: { price_list_type: null },
  },
})
const termek = (valtozatok: number) =>
  ({
    id: "prod_1",
    variants: Array.from({ length: valtozatok }, (_, i) => ({
      id: `v${i + 1}`,
      ...arral(319000 + i * 1000),
    })),
  }) as never

describe("az ár", () => {
  it("angolul a 'from' elöl áll, magyarul a '-tól' hátul", () => {
    const { container, rerender } = render(
      <ProductPrice product={termek(2)} locale="en" />,
    )
    const doboz = container.querySelector(".termeklap-ar")!
    expect(doboz.textContent).toMatch(/^from\s*319/)
    expect(doboz.textContent).not.toContain("-tól")
    rerender(<ProductPrice product={termek(2)} />)
    expect(container.querySelector(".termeklap-ar")!.textContent).toMatch(
      /Ft-tól$/,
    )
  })
})

describe("az állapot-gomb és a jelvény", () => {
  it("angolul a három állapot és a magyarázat angol, magyarul a mostani", () => {
    for (const [allapot, angol, magyar] of [
      ["KAPHATO", "Add to cart", "Kosárba"],
      ["ELFOGYOTT", "Out of stock", "Nincs raktáron"],
    ] as const) {
      const { unmount } = render(
        <StockState
          availability={allapot}
          similarHref="/store"
          onAddToCart={() => undefined}
          locale="en"
        />,
      )
      expect(screen.getByRole("button").textContent).toBe(angol)
      unmount()
      render(
        <StockState
          availability={allapot}
          similarHref="/store"
          onAddToCart={() => undefined}
        />,
      )
      expect(screen.getByRole("button").textContent).toBe(magyar)
      cleanup()
    }
    render(
      <StockState
        availability="ELADVA"
        similarHref="/store"
        onAddToCart={() => undefined}
        locale="en"
      />,
    )
    const doboz = screen.getByTestId("add-product-button-eladva")
    expect(doboz.textContent).not.toMatch(MAGYAR_BETU)
    expect(doboz.textContent).toContain("Not available")
  })

  it("a jelvény és az ígéret angolul angol", () => {
    render(
      <>
        <UniquePieceBadge locale="en" />
        <UniquePiecePromise locale="en" />
      </>,
    )
    expect(screen.getByTestId("unique-piece-badge").textContent).toBe(
      "1 pc · One-of-a-kind piece",
    )
    expect(screen.getByTestId("unique-piece-promise").textContent).toMatch(
      /^The photo shows exactly this piece/,
    )
  })
})

describe("a váz szakaszai", () => {
  it("angolul a cím és a várakozó szöveg angol, a kategória-függetlenül minden szakaszra", () => {
    for (const szakasz of MUSZAKI_LAP_SZAKASZAI) {
      const { container, unmount } = render(
        <VazDoboz szakasz={szakasz} locale="en" />,
      )
      expect(container.textContent ?? "", szakasz.kulcs).not.toMatch(
        MAGYAR_BETU,
      )
      unmount()
    }
    const meret = MUSZAKI_LAP_SZAKASZAI.find(
      (s) => s.kulcs === "meretezes-seged",
    )!
    const { container } = render(<VazDoboz szakasz={meret} locale="en" />)
    expect(container.textContent).toContain("Sizing guide")
    cleanup()
    const magyar = render(<VazDoboz szakasz={meret} />)
    expect(magyar.container.textContent).toContain("Méretezés-segéd")
  })
})

describe("a vásárlási dobozok (kliens, az útvonal nyelvén)", () => {
  it("az ár alatti sor, a kiszerelés és a DOA-mondat angol", () => {
    render(
      <>
        <ArAlattiSor cikkszam="A-1042" egyediPeldany />
        <KiszerelesSor kiszereles="500 ml" />
        <DoaGarancia />
      </>,
    )
    expect(screen.getByTestId("vaz-ar-alatti-sor").textContent).toBe(
      "Gross price · Item no. A-1042 · One-of-a-kind piece, cannot be replaced",
    )
    expect(screen.getByTestId("vaz-egyseg").textContent).toBe("Pack size500 ml")
    expect(screen.getByTestId("doa-garancia").textContent).not.toMatch(
      MAGYAR_BETU,
    )
  })
})

describe("a termék-tudás blokk", () => {
  const tudas = {
    facts: [
      { field: "packSize", status: "VERIFIED", value: "500", unit: "ml" },
      { field: "dosing", status: "CONFLICTING_SOURCES", value: "x" },
      { field: "manufacturerInfo", status: "VERIFIED", value: "Gyártó Kft." },
    ],
    copy: [],
  } as never

  it("angolul a címkék angolok, a gyártói adat és az érték változatlan", () => {
    render(<TermekTudasBlokk tudas={tudas} locale="en" />)
    const blokk = screen.getByTestId("termek-tudas")
    expect(blokk.textContent).toContain("Pack size")
    expect(blokk.textContent).toContain("The sources differ")
    expect(blokk.textContent).toContain("Manufacturer data")
    expect(blokk.textContent).toContain("Gyártó Kft.")
  })

  it("alapértelmezésben magyar", () => {
    render(<TermekTudasBlokk tudas={tudas} />)
    expect(screen.getByTestId("termek-tudas").textContent).toContain(
      "A források eltérnek",
    )
  })
})

describe("a rendelési mondat és a kosár-üzenetek", () => {
  const be = { minimum: 2, step: 2, orderMaximum: 10 }

  it("magyarul betű szerint a mostani mondatok", () => {
    expect(orderQuantityHint(be)).toBe(
      "Ebből a termékből legalább 2 darab rendelhető, és 2 darabonként növelhető, de legfeljebb 10 darab rendelhető.",
    )
    expect(orderQuantityHint({ minimum: 1, step: 1, orderMaximum: 5 })).toBe(
      "Ebből a termékből legfeljebb 5 darab rendelhető.",
    )
    expect(
      kosarbaTehetoMennyiseg({ kert: 5, rendelesiMaximum: 3, kosarban: 3 }),
    ).toEqual({
      kind: "tele",
      uzenet:
        "Ebből a termékből egy rendelésbe legfeljebb 3 darab tehető, és 3 darab már a kosaradban van.",
    })
    expect(
      kosarbaTehetoMennyiseg({ kert: 5, rendelesiMaximum: 4, kosarban: 1 }),
    ).toMatchObject({
      kind: "vagott",
      megjegyzes:
        "Ebből a termékből egy rendelésbe legfeljebb 4 darab tehető, ezért 3 darabot tettünk a kosárba (1 darab már benne volt).",
    })
    expect(kosarUzenet(undefined)).toBe(
      "A kosár frissítése most nem sikerült. Próbáld meg újra.",
    )
    expect(kosarUzenet(422)).toBe(
      "Ezt a mennyiséget nem tudtuk beállítani. Próbálj meg kevesebbet.",
    )
  })

  it("angolul angol mondatok", () => {
    const mind = [
      orderQuantityHint(be, en),
      orderQuantityHint({ minimum: 1, step: 1, orderMaximum: 5 }, en),
      kosarUzenet(undefined, en),
      kosarUzenet(422, en),
      kosarbaTehetoMennyiseg({ kert: 5, rendelesiMaximum: 3, kosarban: 3 }, en)
        .kind === "tele"
        ? en("product.cartFull", { max: 3, inCart: 3 })
        : "",
    ]
    for (const mondat of mind) expect(mondat).not.toMatch(MAGYAR_BETU)
    expect(orderQuantityHint(be, en)).toBe(
      "Of this product, at least 2 pieces can be ordered, in steps of 2, but at most 10 pieces can be ordered.",
    )
    const vagott = kosarbaTehetoMennyiseg(
      { kert: 5, rendelesiMaximum: 4, kosarban: 1 },
      en,
    )
    expect(vagott).toMatchObject({ kind: "vagott" })
    expect((vagott as { megjegyzes: string }).megjegyzes).toBe(
      "You can put at most 4 pieces of this product into one order, so we added 3 to the cart (1 were already in it).",
    )
  })
})

describe("a képek alt-szövege", () => {
  it("a sorszámozott alt a lap nyelvén áll, a termék neve változatlan", () => {
    expect(galeriaAlt("Eheim Skim", 1, 3)).toBe("Eheim Skim (2. kép)")
    expect(galeriaAlt("Eheim Skim", 1, 3, en)).toBe("Eheim Skim (image 2)")
    expect(galeriaAlt("Eheim Skim", 0, 3, en)).toBe("Eheim Skim")
    expect(hu("product.imageAlt", { title: "A", n: 2 })).toBe("A (2. kép)")
  })
})

describe("az Omnibus-sor angolul", () => {
  it("teljes és rövid történetnél is angol mondat, magyar betű nélkül", () => {
    const { rerender } = render(
      <OmnibusSor
        referencia={{
          amount: 12500,
          currencyCode: "huf",
          complete: true,
          historyBegins: "2026-09-01",
        }}
      />,
    )
    const teljes = screen.getByTestId("vaz-omnibus-sor").textContent ?? ""
    expect(teljes).toContain(
      "Lowest price in the 30 days before the price reduction:",
    )
    expect(teljes).not.toMatch(MAGYAR_BETU)
    rerender(
      <OmnibusSor
        referencia={{
          amount: 1500,
          currencyCode: "huf",
          complete: false,
          historyBegins: "2026-10-25",
        }}
      />,
    )
    const rovid = screen.getByTestId("vaz-omnibus-sor").textContent ?? ""
    expect(rovid).not.toContain("30 days")
    expect(rovid).toContain("25 Oct 2026")
  })
})
