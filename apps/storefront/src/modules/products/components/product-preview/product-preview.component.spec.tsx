import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

vi.mock("@modules/common/components/localized-client-link", () => ({
  default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}))
vi.mock("../thumbnail", () => ({
  default: () => <div data-testid="thumbnail" />,
}))

import ProductPreview from "./index"

afterEach(cleanup)

const termek = (metadata: unknown) =>
  ({
    id: "prod_1",
    handle: "teszt",
    title: "Teszt termék",
    metadata,
    variants: [],
  }) as never

const megjelenit = async (metadata: unknown) => {
  const elem = await ProductPreview({
    product: termek(metadata),
    region: {} as never,
  })
  render(elem as React.ReactElement)
}

/**
 * AZ EGYEDI PELDANY JELVENYE A LISTA-KARTYAN (64c8452a).
 *
 * === MIERT KELL MIND A KET IRANY ===
 *
 * Egy "megjelenik a jelveny" allitas onmagaban akkor is zold lenne, ha a
 * jelveny MINDEN kartyan ott allna -- ami rosszabb a mai allapotnal, mert
 * minden termeket egyedi peldanynak mondana. Ezert a masodik allitas azt meri,
 * hogy jelzo NELKUL NINCS ott.
 *
 * A HATARA: ez a komponenst meri, nem a lekerdezest. Hogy a `metadata`
 * egyaltalan megerkezik-e a listaba, az a `lib/data/products.ts` `fields`
 * erteken mulik, es azt a komponens fejlece nevezi meg.
 */
describe("a lista-kártya jelvénye", () => {
  it("egyedi példánynál megjelenik a jelvény", async () => {
    await megjelenit({ unique_piece: "true" })

    expect(screen.getByTestId("unique-piece-badge")).toBeTruthy()
  })

  it("jelző nélkül NINCS jelvény", async () => {
    await megjelenit({})

    expect(screen.queryByTestId("unique-piece-badge")).toBeNull()
  })

  /**
   * ISMERT POZITIV KONTROLL: a kartya maga mind a ket esetben megrajzolodik.
   * Enelkul a fenti "nincs jelveny" allitast egy OSSZEOMLOTT komponens is
   * kielegitene.
   */
  it("a kártya jelző nélkül is megjelenik", async () => {
    await megjelenit({})

    expect(screen.getByTestId("product-wrapper")).toBeTruthy()
    expect(screen.getByTestId("product-title")).toBeTruthy()
  })
})
