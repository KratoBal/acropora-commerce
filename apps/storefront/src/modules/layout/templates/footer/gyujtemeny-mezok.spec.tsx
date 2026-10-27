import { describe, expect, it, vi } from "vitest"

/**
 * A LABLEC ES A GYUJTEMENY-LAPLISTA CSAK A SZUKSEGES MEZOKET KERI (kartya
 * 62811c0f). A `*products` minden gyujtemeny minden termeket hozta (a stage-en
 * 1,7 MB), es a Next 2 MB korul nem tarolja: minden lap ujra lekerte.
 *
 * MI PIROSIT: ha barmelyik hivas visszakapja a termekeket (`*products`), vagy
 * a lablec nem kapja meg, amit kiir (title, handle).
 */

const listCollections = vi.hoisted(() =>
  vi.fn(async () => ({ collections: [], count: 0 })),
)
vi.mock("server-only", () => ({}))
vi.mock("@lib/data/collections", () => ({ listCollections }))
vi.mock("@lib/data/regions", () => ({ listRegions: vi.fn(async () => []) }))
/* a lablec a kezdolap rekordjat is kerdezi (szerkesztheto lablec); itt nincs rekord */
vi.mock("@lib/data/kezdolap-tartalom", () => ({
  kezdolapTartalom: vi.fn(async () => null),
}))

describe("a gyűjtemény-lista mezői", () => {
  // 2026-10-27 (kirakat-lablec-kep): a Kollekciók oszlop kikerült, a lábléc
  // egyáltalán nem kérdezi le a gyűjteményeket
  it("a lábléc nem kéri le a gyűjteményeket", async () => {
    const { default: Footer } = await import("./index")
    await Footer()
    expect(listCollections).not.toHaveBeenCalled()
  })

  it("a gyűjtemény-lapok listája csak id és handle mezőt kér", async () => {
    listCollections.mockClear()
    const { generateStaticParams } =
      await import("../../../../app/[countryCode]/(main)/collections/[handle]/page")
    await generateStaticParams()
    expect(listCollections).toHaveBeenCalledWith({ fields: "id,handle" })
    for (const [arg] of listCollections.mock.calls as unknown as [
      { fields: string },
    ][])
      expect(arg.fields).not.toContain("products")
  })
})
