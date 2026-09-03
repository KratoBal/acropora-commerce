import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * The entrypoint's whole job is a refusal: when migrations fail, the server
 * must NOT start. A guard is not proven by the error it prints but by the
 * fact that nothing happened afterwards, so both assertions below check for
 * the ABSENCE of the start, not for the message.
 *
 * No database is involved on purpose. What is under test is the script's
 * contract - "stop before `exec` if the migration exits non-zero" - and that
 * is decided by the exit code of `medusa db:migrate`, whatever produced it.
 * Whether Medusa itself migrates an empty schema correctly is Medusa's
 * behaviour and needs a real database; this cannot and does not claim it.
 */

const ENTRYPOINT = join(__dirname, "..", "..", "docker-entrypoint.sh")

/// Puts a fake `npx` first on PATH. It exits with the code the test asks for -
/// which is exactly the signal the entrypoint branches on.
///
/// IT BRANCHES ON THE SUBCOMMAND, AND THAT IS THE POINT OF THE SECOND
/// PARAMETER. The entrypoint now runs npx TWICE (`medusa db:migrate`, then
/// `medusa exec <verify script>`), and a fake that returns one code for both
/// could not tell the two refusals apart: a test asserting "the server did not
/// start" would pass even if the entrypoint had dropped the second step
/// entirely.
function runEntrypoint(
  migrateExitCode: number,
  verifyExitCode = 0
): {
  status: number | null
  serverStarted: boolean
} {
  const dir = mkdtempSync(join(tmpdir(), "entrypoint-"))
  const marker = join(dir, "server-started")
  const fakeNpx = join(dir, "npx")

  writeFileSync(
    fakeNpx,
    [
      "#!/bin/sh",
      'case "$2" in',
      `  db:migrate) exit ${migrateExitCode} ;;`,
      `  exec) exit ${verifyExitCode} ;;`,
      "  *) exit 0 ;;",
      "esac",
      "",
    ].join("\n")
  )
  chmodSync(fakeNpx, 0o755)

  const result = spawnSync(
    "/bin/sh",
    [ENTRYPOINT, "/bin/sh", "-c", `printf started > ${marker}`],
    {
      env: { ...process.env, PATH: `${dir}:${process.env.PATH ?? ""}` },
      encoding: "utf8",
    }
  )

  let serverStarted = false
  try {
    execFileSync("/usr/bin/test", ["-f", marker])
    serverStarted = true
  } catch {
    serverStarted = false
  }

  return { status: result.status, serverStarted }
}

describe("docker-entrypoint.sh", () => {
  it("does not start the server when the migration fails", () => {
    const { status, serverStarted } = runEntrypoint(1)

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  /*
    A MASODIK MEGTAGADAS. A hat szallitasi azonositot kezzel visszuk at minden
    kornyezetbe, es ha egy hibas, a bolt ELINDUL, a kassza pedig nem kinal
    fizetesi modot. Nincs hibauzenet, nincs naplo sor: pontosan az a fajta hiba,
    amit csak egy elmaradt rendeles mutat meg, hetekkel kesobb.

    Az allitas ugyanaz az alak, mint a migracional: nem az uzenetet nezi, hanem
    azt, hogy a szerver NEM indult el.
  */
  it("does not start the server when the shipping id check fails", () => {
    const { status, serverStarted } = runEntrypoint(0, 1)

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  it("starts the server when the migration and the id check both succeed", () => {
    const { status, serverStarted } = runEntrypoint(0, 0)

    expect(status).toBe(0)
    expect(serverStarted).toBe(true)
  })
})
