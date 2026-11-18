import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

/*
  EVERY MIGRATION FILE EXPORTS EXACTLY ONE THING, THE MIGRATION CLASS. Medusa's migrator takes the module's FIRST export as
  the class (`Object.values(module)[0]`, @medusajs/utils custom-db-migrator). On 2026-11-18 a migration exported a row list
  next to its class; in the compiled file the list came first ("MigrationClass is not a constructor"), `db:migrate` failed,
  and the test shop's server restarted in a loop (#802). From the TypeScript source the order was the other way round, so an
  import-based test passed: this guard reads the SOURCE TEXT, where the number of exports does not depend on the compiler.
*/

const MODULES = join(__dirname, "..")

const migrationFiles = (): string[] =>
  readdirSync(MODULES, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((module) => {
      const dir = join(MODULES, module.name, "migrations")
      try {
        return readdirSync(dir)
          .filter((name) => /^Migration\d{14}\.ts$/.test(name))
          .map((name) => join(dir, name))
      } catch {
        return []
      }
    })

/** The exports a source text declares: `export <kind> <name>`, `export { ... }` and `export default`. */
const exportsOf = (source: string): string[] => [
  ...[...source.matchAll(/^export\s+(?:abstract\s+)?(?:class|const|let|var|function|type|interface|enum)\s+(\w+)/gm)].map((m) => m[1]!),
  ...[...source.matchAll(/^export\s*\{([^}]*)\}/gm)].flatMap((m) => m[1]!.split(",").map((s) => s.trim()).filter(Boolean)),
  ...(/^export\s+default\b/m.test(source) ? ["default"] : []),
]

describe("migration files", () => {
  it("sees the migrations (more than the one this guard was written for)", () => {
    expect(migrationFiles().length).toBeGreaterThan(10)
  })

  it("each exports exactly one thing: its own class, named after the file", () => {
    const wrong = migrationFiles()
      .map((file) => {
        const name = file.split("/").pop()!.replace(/\.ts$/, "")
        return { file: file.slice(MODULES.length + 1), name, exports: exportsOf(readFileSync(file, "utf8")) }
      })
      .filter((m) => m.exports.length !== 1 || m.exports[0] !== m.name)
    expect(wrong).toEqual([])
  })

  it("control: the form that broke the test shop is caught", () => {
    const broken = `export const ROWS_INSERTED_HERE = [] as const\n\nexport class Migration20261118220000 extends Migration {}\n`
    expect(exportsOf(broken)).toEqual(["ROWS_INSERTED_HERE", "Migration20261118220000"])
  })
})
