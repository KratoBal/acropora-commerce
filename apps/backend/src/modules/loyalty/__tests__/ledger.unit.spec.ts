import { readFileSync } from "node:fs"
import { join } from "node:path"

import { sumPoints } from "../balance"
import { LOYALTY_KINDS } from "../types"

/*
  WHAT TURNS THIS RED. A balance that is not the plain sum of the signed rows; a migration that drifts from the model
  (an index the model names and the migration does not create, a kind the service accepts and the database check
  refuses); the migration losing the zero check or the unique key index.
*/
const read = (...parts: string[]) => readFileSync(join(__dirname, "..", ...parts), "utf8")

describe("sumPoints", () => {
  it("is the plain sum of the signed rows, and zero for none", () => {
    expect(sumPoints([])).toBe(0)
    expect(sumPoints([{ points: 500 }, { points: -120 }, { points: 20 }])).toBe(400)
    expect(sumPoints([{ points: 5 }, { points: -5 }])).toBe(0)
  })
})

describe("the migration and the model", () => {
  const migration = read("migrations", "Migration20261119010000.ts")
  const model = read("models", "loyalty-entry.ts")

  it("creates every index the model names", () => {
    const named = [...model.matchAll(/name:\s*"(IDX_[A-Za-z0-9_]+)"/g)].map((m) => m[1]!)
    expect(named.length).toBeGreaterThanOrEqual(2)
    expect(named.filter((name) => !migration.includes(`"${name}"`))).toEqual([])
  })

  it("keeps the reference key unique only while set, and refuses a zero movement", () => {
    expect(migration).toMatch(/CREATE UNIQUE INDEX IF NOT EXISTS "IDX_loyalty_entry_reference"[^;]*WHERE reference IS NOT NULL AND deleted_at IS NULL/)
    expect(migration).toContain(`check ("points" <> 0)`)
  })

  it("lists in the database check exactly the kinds the code knows", () => {
    const check = migration.match(/check \("kind" in \(([^)]*)\)\)/)
    expect(check).not.toBeNull()
    const inCheck = check![1]!.split(",").map((s) => s.trim().replace(/'/g, ""))
    expect([...inCheck].sort()).toEqual([...LOYALTY_KINDS].sort())
  })
})
