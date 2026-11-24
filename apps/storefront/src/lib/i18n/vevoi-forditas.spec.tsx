import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import { vevoiSzovegek } from "@lib/data/vevoi-szovegek"
import { szerverFa } from "@lib/teszt/szerver-fa"
import StepIndicator from "@modules/cart/components/step-indicator"
import { translator } from "./dictionary"
import { useTranslate, useTranslateFor } from "./use-translate"
import { vevoiForditas } from "./vevoi-forditas"
import { VevoiSzovegekProvider } from "./vevoi-szovegek-kontextus"

vi.mock("next/navigation", () => ({ useParams: () => ({ countryCode: "hu" }) }))

/**
 * AZ OS-BEN ÁTÍRT VEVŐI SZÖVEG A SZÓTÁR FÖLÖTT (kártya 7bfca4eb), a fordító mindhárom útján: a fordító maga, a szerver-komponens
 * (`vevoiForditas`) és a kliens-komponens (`useTranslate`, a keret providere).
 *
 * MI PIROSÍT: a felülírás nem nyer a szótár fölött; egy nyelv felülírása a másik nyelvet is átírja; a `{slot}` a felülírásban nem
 * töltődik ki; a szerver-komponens vagy a kliens-komponens nem kapja meg a felülírást.
 */
afterEach(cleanup)

describe("a fordító a felülírással", () => {
  it("a felülírás nyer, a kitöltés rajta is megy, a többi kulcs a szótáré", () => {
    const t = translator("hu", {
      "cartPage.stepOf": "{current}. lépés a {total}-ból",
    })
    expect(t("cartPage.stepOf", { current: 2, total: 3 })).toBe(
      "2. lépés a 3-ból",
    )
    expect(t("cartPage.stepCart")).toBe(translator("hu")("cartPage.stepCart"))
  })

  it("csak a saját nyelvét írja át: a magyar felülírás az angol lapon nem látszik", async () => {
    vi.mocked(vevoiSzovegek).mockImplementation(async (locale) =>
      locale === "hu"
        ? { "cartPage.stepCart": "Kosaram" }
        : ({} as Record<string, string>),
    )
    expect((await vevoiForditas("hu"))("cartPage.stepCart")).toBe("Kosaram")
    expect((await vevoiForditas("en"))("cartPage.stepCart")).toBe(
      translator("en")("cartPage.stepCart"),
    )
    vi.mocked(vevoiSzovegek).mockReset()
  })
})

describe("a felülírás eljut a komponensekig", () => {
  it("szerver-komponens: a lépés-jelző az átírt szöveget mutatja", async () => {
    vi.mocked(vevoiSzovegek).mockResolvedValueOnce({
      "cartPage.stepsLabel": "Hol tartasz",
    })
    render(await szerverFa(<StepIndicator countryCode="hu" active={0} />))
    expect(screen.getByLabelText("Hol tartasz")).toBeInTheDocument()
  })

  it("kliens-komponens: a keret providere alatt a useTranslate és a useTranslateFor az átírt szöveget adja, a másik nyelv nem", () => {
    const Proba = () => {
      const t = useTranslate()
      const angol = useTranslateFor("en")
      return (
        <>
          <p data-testid="hu">{t("cartPage.stepCart")}</p>
          <p data-testid="en">{angol("cartPage.stepCart")}</p>
        </>
      )
    }
    render(
      <VevoiSzovegekProvider
        locale="hu"
        szovegek={{ "cartPage.stepCart": "Kosaram" }}
      >
        <Proba />
      </VevoiSzovegekProvider>,
    )
    expect(screen.getByTestId("hu")).toHaveTextContent("Kosaram")
    expect(screen.getByTestId("en")).toHaveTextContent(
      translator("en")("cartPage.stepCart"),
    )
  })

  it("provider nélkül a szótár szövege", () => {
    const Proba = () => (
      <p data-testid="hu">{useTranslate()("cartPage.stepCart")}</p>
    )
    render(<Proba />)
    expect(screen.getByTestId("hu")).toHaveTextContent(
      translator("hu")("cartPage.stepCart"),
    )
  })
})
