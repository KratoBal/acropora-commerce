import { describe, expect, it } from "vitest"

import { lepesjelzoAllas } from "./penztar-lepes"

describe("a lépésjelző állása az űrlap-oldalon", () => {
  it("a cím és a szállítás az Adatok (2 / 3)", () => {
    expect(lepesjelzoAllas(undefined)).toBe(1)
    expect(lepesjelzoAllas("address")).toBe(1)
    expect(lepesjelzoAllas("delivery")).toBe(1)
  })

  it("az ellenőrzés már a Fizetés lépése (3 / 3)", () => {
    expect(lepesjelzoAllas("review")).toBe(2)
  })
})
