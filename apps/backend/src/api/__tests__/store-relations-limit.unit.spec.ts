import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

import { getRelationsDepth, validateRelationsLimit } from "@medusajs/framework/http"

import { STORE_RELATIONS_LIMIT } from "../store-relations-limit"

/**
 * THE STOREFRONT'S DEEPEST STORE API REQUEST MUST FIT UNDER THE LIMIT.
 *
 * Medusa 2.20 rejects a Store API request that expands more relations than
 * `http.storeRelationsLimit` (400 INVALID_DATA). The storefront's requests are
 * written as `fields` strings in its own source, so this test reads them there
 * and measures each one with the framework's OWN depth function - the same one
 * the server uses - rather than with a copy of its rule.
 *
 * WHAT MAKES IT FAIL: a storefront query deepened past the limit, or the limit
 * lowered below today's deepest query (the five-level category breadcrumb).
 *
 * WHAT IT CANNOT SEE, stated: a `fields` value built at runtime from pieces.
 * Today every request is a literal; the positive control below proves the
 * scan finds the one that matters, so an empty scan cannot pass as a green.
 */

const STOREFRONT_SRC = join(__dirname, "../../../../storefront/src")

const sourceFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return /\.(ts|tsx)$/.test(name) && !/\.spec\.(ts|tsx)$/.test(name)
      ? [path]
      : []
  })

/** Every comma-separated field from a string literal that starts like a `fields` value. */
const requestedFields = (): { field: string; file: string }[] =>
  sourceFiles(STOREFRONT_SRC).flatMap((file) =>
    Array.from(readFileSync(file, "utf8").matchAll(/"([*+][^"]*)"/g)).flatMap(
      ([, literal]) =>
        literal
          .split(",")
          .map((field) => field.trim().replace(/^[+-]/, ""))
          .filter((field) => field.length > 0)
          .map((field) => ({ field, file }))
    )
  )

describe("STORE_RELATIONS_LIMIT against the storefront's requests", () => {
  const fields = requestedFields()
  const deepest = Math.max(...fields.map(({ field }) => getRelationsDepth(field)))

  /**
   * POSITIVE CONTROL: the scan reached the storefront and found the five-level
   * category chain. Without this, a moved directory or a broken pattern would
   * yield an empty list and every assertion below would pass on nothing.
   */
  it("finds the five-level category breadcrumb request", () => {
    expect(
      fields.some(
        ({ field, file }) =>
          file.endsWith("lib/data/categories.ts") &&
          field ===
            "*parent_category.parent_category.parent_category.parent_category.parent_category"
      )
    ).toBe(true)
    expect(deepest).toBeGreaterThanOrEqual(5)
  })

  it("admits every storefront request, as the server itself would judge it", () => {
    expect(() =>
      validateRelationsLimit(
        fields.map(({ field }) => field),
        STORE_RELATIONS_LIMIT
      )
    ).not.toThrow()
  })

  /**
   * The framework default is 3. This pins that the default would NOT be enough,
   * which is the reason the setting exists - if the storefront's queries ever
   * become shallow enough, this goes red and the setting can be removed.
   */
  it("needs more than the framework default of 3", () => {
    expect(() =>
      validateRelationsLimit(
        fields.map(({ field }) => field),
        3
      )
    ).toThrow(/expand more than the maximum of 3/)
  })
})
