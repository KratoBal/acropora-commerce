import { describe, expect, it } from "vitest"

import { en } from "./en"
import { fill, getDictionary, translator } from "./index"
import { hu } from "./hu"

/**
 * The dictionaries. What must fail: an English key missing or extra (the TYPE says it at compile time; this says it at run time too, for
 * a build that ignores types: `next.config.js` sets `ignoreBuildErrors`); an empty text; a placeholder in one language and not in the
 * other; a placeholder left unfilled; a fallback that returns an empty string.
 */
const leaves = (node: unknown, path = ""): [string, string][] =>
  typeof node === "string"
    ? [[path, node]]
    : Object.entries(node as Record<string, unknown>).flatMap(([k, v]) => leaves(v, path ? `${path}.${k}` : k))

const placeholders = (text: string) => (text.match(/\{\w+\}/g) ?? []).map((m) => m.slice(1, -1)).sort()

describe("the dictionaries", () => {
  const huLeaves = leaves(hu)
  const enLeaves = leaves(en)

  it("have exactly the same keys", () => {
    expect(enLeaves.map(([k]) => k).sort()).toEqual(huLeaves.map(([k]) => k).sort())
    expect(huLeaves.length).toBeGreaterThan(10)
  })

  it("have no empty text, and the same placeholders in both languages", () => {
    const enBy = new Map(enLeaves)
    for (const [key, text] of huLeaves) {
      expect(text.trim(), `hu ${key}`).not.toBe("")
      expect(enBy.get(key)!.trim(), `en ${key}`).not.toBe("")
      expect(placeholders(enBy.get(key)!), `placeholders of ${key}`).toEqual(placeholders(text))
    }
  })

  it("the English text is not the Hungarian one (a copied text is an untranslated one), except for a few shared words", () => {
    const enBy = new Map(enLeaves)
    const same = huLeaves.filter(([k, text]) => enBy.get(k) === text).map(([k]) => k)
    expect(same).toEqual([])
  })
})

describe("translator", () => {
  it("answers in the language asked, Hungarian by default", () => {
    expect(translator("hu")("cart.add")).toBe("Kosárba")
    expect(translator("en")("cart.add")).toBe("Add to cart")
    expect(getDictionary("en")).toBe(en)
  })

  it("fills the placeholders, and leaves an unfilled one visible", () => {
    expect(translator("hu")("category.productCount", { count: 7 })).toBe("7 termék")
    expect(translator("en")("category.productCount", { count: 7 })).toBe("7 products")
    expect(translator("en")("category.productCount")).toBe("{count} products")
    expect(fill("a {x} b {y}", { x: 1 })).toBe("a 1 b {y}")
  })

  it("a key nobody has comes back as the key, never as an empty string", () => {
    expect(translator("en")("category.nincsIlyen" as never)).toBe("category.nincsIlyen")
    expect(translator("hu")("category" as never)).toBe("category")
  })
})
