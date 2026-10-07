import { describe, expect, it, vi } from "vitest"

import { rumKuldes } from "./index"

/**
 * A RUM KULDES (FE-7). MI PIROSIT: ha az utvonal (benne egy fizetesi token)
 * kimenne; ha egy ismeretlen meroszam is kimenne.
 */
describe("rumKuldes", () => {
  it("a mérőszám, a kerekített érték és az oldal TÍPUSA megy ki, az útvonal nem", () => {
    const kuld = vi.fn()
    const ment = rumKuldes(
      { name: "LCP", value: 2140.6, rating: "needs-improvement" },
      "/hu/rendeles-fizetese/titkos-token-123",
      kuld,
    )
    expect(ment).toBe(true)
    const torzs = kuld.mock.calls[0]![0] as string
    expect(JSON.parse(torzs)).toEqual({
      n: "LCP",
      v: 2141,
      r: "needs-improvement",
      t: "rendeles",
    })
    expect(torzs).not.toContain("titkos-token-123")
  })

  it("ismeretlen mérőszám nem megy ki", () => {
    const kuld = vi.fn()
    expect(
      rumKuldes({ name: "Next.js-hydration", value: 12 }, "/hu", kuld),
    ).toBe(false)
    expect(kuld).not.toHaveBeenCalled()
  })
})
