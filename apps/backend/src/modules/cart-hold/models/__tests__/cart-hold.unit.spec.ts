import { readFileSync, readdirSync } from "fs"
import { join } from "path"

import CartHold from "../cart-hold"

/** The model and its migration, without a database (the stock alert model's spec, same reason). */
const migrations = () => {
  const dir = join(__dirname, "../../migrations")
  return readdirSync(dir)
    .map((f) => readFileSync(join(dir, f), "utf-8"))
    .join("\n")
}

describe("cart hold model", () => {
  it("CH-MODEL: the piece, the holder and the end, nothing else", () => {
    expect(Object.keys(CartHold.parse().schema).sort()).toEqual([
      "cart_id",
      "created_at",
      "deleted_at",
      "expires_at",
      "id",
      "updated_at",
      "variant_id",
    ])
  })

  it("CH-MODEL-UNIQUE: one live row per piece, in the model and in the migration", () => {
    const indexes = (CartHold as any).parse().indexes ?? (CartHold as any).indexes_ ?? []
    const unique = JSON.stringify(indexes)
    expect(unique).toContain("IDX_cart_hold_variant_unique")
    const sql = migrations()
    expect(sql).toContain(
      `CREATE UNIQUE INDEX IF NOT EXISTS "IDX_cart_hold_variant_unique" ON "cart_hold" ("variant_id") WHERE deleted_at IS NULL;`
    )
    for (const column of ['"variant_id" text not null', '"cart_id" text not null', '"expires_at" timestamptz not null'])
      expect(sql).toContain(column)
  })
})
