import { HttpTypes } from "@medusajs/types"
import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("next/navigation", () => ({
  useParams: () => ({ countryCode: "hu" }),
  usePathname: () => "/hu/checkout",
  useRouter: () => ({ push: vi.fn() }),
  useSearchParams: () => new URLSearchParams("step=payment"),
}))

vi.mock("@lib/data/cart", () => ({
  initiatePaymentSession: vi.fn(),
}))

import Payment from "./index"
import type { EngedelyezettFizetesiMod } from "@lib/util/fizetesi-modok"

afterEach(cleanup)

/**
 * A REGIO KINALATA MINDVEGIG UGYANAZ: mindket szolgaltato engedelyezve van
 * ebben a regioban. Ami valtozik, az KIZAROLAG a hatter valasza -- igy amit a
 * tesztek merni tudnak, az a szures maga, nem a fixture kulonbsege.
 */
const REGIO_KINALATA = [{ id: "pp_system_default" }, { id: "pp_acropora_cod" }]

function kosar() {
  return {
    id: "cart-1",
    email: "vevo@example.test",
    shipping_address: { id: "addr-1", country_code: "hu" },
    billing_address: { id: "addr-2", country_code: "hu" },
    shipping_methods: [{ id: "sm-1" }],
    payment_collection: { payment_sessions: [] },
  } as unknown as HttpTypes.StoreCart
}

/**
 * EGY FIZETESI MOD KET `radio` SZEREPU ELEMET RAJZOL (merve): a valaszthato
 * sort magat (span, benne a cimke) es a jelolo gombot (button, szoveg nelkul).
 * A FELIRATOS elemeket szamoljuk, mert az felel meg annak, amit a vevo lat --
 * egy nyers `getAllByRole("radio")` a duplajat adna, es a szam ettol ugy
 * nezne ki, mintha kettot kinalnank.
 */
function felkinaltModok() {
  return screen
    .getAllByRole("radio")
    .filter((elem) => (elem.textContent ?? "").trim().length > 0)
}

function lapotRajzol(engedelyezettModok: EngedelyezettFizetesiMod[]) {
  return render(
    <Payment
      cart={kosar()}
      availablePaymentMethods={REGIO_KINALATA}
      engedelyezettModok={engedelyezettModok}
    />,
  )
}

describe("a fizetési lépés csak azt kínálja, amit a háttér enged", () => {
  it("nehézáru kosáron az utánvét jelenik meg, magyar címkével", () => {
    lapotRajzol([{ id: "pp_acropora_cod", role: "COD" }])

    expect(felkinaltModok()).toHaveLength(1)
    expect(screen.getByText("Utánvét")).toBeTruthy()
  })

  /**
   * A MASIK IRANY, ES EZ A LENYEG: ugyanaz a regio-kinalat, mas hatter-valasz.
   * Enelkul egy olyan valtozat is atmenne, ami egyszeruen mindent kirajzol --
   * a fenti allitas ugyanugy talalna egy "Utánvét" feliratot.
   */
  it("bolti átvételnél az utánvét NEM jelenik meg, holott a régió kínálja", () => {
    lapotRajzol([{ id: "pp_system_default", role: "PAY_AT_STORE" }])

    expect(felkinaltModok()).toHaveLength(1)
    expect(screen.getByText("Fizetés a boltban")).toBeTruthy()
    expect(screen.queryByText("Utánvét")).toBeNull()
  })

  /**
   * ES A NYERS AZONOSITO SEM JELENHET MEG. A sablon terkepeben nincs benne a
   * sajat szolgaltatonk, tehat cimke nelkul a vevo ezt a szoveget olvasna.
   */
  it("a saját szolgáltató nyers azonosítója sehol nem látszik", () => {
    lapotRajzol([{ id: "pp_acropora_cod", role: "COD" }])

    expect(screen.queryByText("pp_acropora_cod")).toBeNull()
  })

  it("üres engedély-listánál mondatot kap a vevő, nem üres képernyőt", () => {
    lapotRajzol([])

    expect(screen.queryAllByRole("radio")).toHaveLength(0)
    expect(screen.getByTestId("nincs-fizetesi-mod").textContent).toContain(
      "nincs elérhető fizetési mód",
    )
  })
})
