import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

/**
 * The entrypoint's whole job is a refusal: when a check fails, the server must
 * NOT start. A guard is not proven by the error it prints but by the fact that
 * nothing happened afterwards, so every assertion below checks for the ABSENCE
 * of the start, not for the message.
 *
 * No database is involved on purpose. What is under test is the script's
 * contract - "stop before `exec` if a step exits non-zero" - and that is
 * decided by the exit codes of the steps, whatever produced them. Whether
 * Medusa itself migrates an empty schema correctly is Medusa's behaviour and
 * needs a real database; this cannot and does not claim it.
 */

const ENTRYPOINT = join(__dirname, "..", "..", "docker-entrypoint.sh")

type StepExitCodes = {
  /** `node ./src/scripts/verify-file-backend-url.js` */
  fileUrl?: number
  /** `npx medusa db:migrate` */
  migrate?: number
  /** `npx medusa exec ./src/scripts/verify-shipping-option-roles.js` */
  shippingIds?: number
}

/// Puts a fake `npx` AND a fake `node` first on PATH. Each exits with the code
/// the test asks for - which is exactly the signal the entrypoint branches on.
///
/// EVERY STEP GETS ITS OWN CODE, AND THAT IS THE POINT OF THE OPTIONS OBJECT.
/// The entrypoint now runs three checks, and a fake that returned one code for
/// all of them could not tell the refusals apart: a test asserting "the server
/// did not start" would pass even if the entrypoint had dropped two of the
/// three steps entirely.
///
/// THE FAKE `node` IS NOT DECORATION EITHER. It was added because the real one
/// caught a real fault: the file-prefix step was appended to the entrypoint
/// while this harness still faked `npx` only, so the third test ran the real
/// `node` against a path that exists only in the built image, and the entrypoint
/// refused to start on a correct configuration. The harness has to know about
/// every process the script starts, or "the server did not start" stops meaning
/// what the test says it means.
function runEntrypoint({
  fileUrl = 0,
  migrate = 0,
  shippingIds = 0,
}: StepExitCodes = {}): {
  status: number | null
  serverStarted: boolean
} {
  const dir = mkdtempSync(join(tmpdir(), "entrypoint-"))
  const marker = join(dir, "server-started")

  writeFileSync(
    join(dir, "npx"),
    [
      "#!/bin/sh",
      'case "$2" in',
      `  db:migrate) exit ${migrate} ;;`,
      `  exec) exit ${shippingIds} ;;`,
      "  *) exit 0 ;;",
      "esac",
      "",
    ].join("\n")
  )
  chmodSync(join(dir, "npx"), 0o755)

  writeFileSync(
    join(dir, "node"),
    ["#!/bin/sh", `exit ${fileUrl}`, ""].join("\n")
  )
  chmodSync(join(dir, "node"), 0o755)

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
  /*
    AZ ELSO MEGTAGADAS. A MEDUSA_FILE_BACKEND_URL nelkul a bolt ELINDUL, es a
    kepek belso, localhost cimet adja ki a vevonek. A sajat kepernyoink jok
    maradnak, tehat a hibat egyedul a vevo latja - ez a fajta csend a hiba, nem
    a hianyzo valtozo.
  */
  it("does not start the server when the public image prefix is missing", () => {
    const { status, serverStarted } = runEntrypoint({ fileUrl: 1 })

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  it("does not start the server when the migration fails", () => {
    const { status, serverStarted } = runEntrypoint({ migrate: 1 })

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  /*
    A HARMADIK MEGTAGADAS. A hat szallitasi azonositot kezzel visszuk at minden
    kornyezetbe, es ha egy hibas, a bolt ELINDUL, a kassza pedig nem kinal
    fizetesi modot. Nincs hibauzenet, nincs naplo sor: pontosan az a fajta hiba,
    amit csak egy elmaradt rendeles mutat meg, hetekkel kesobb.

    Az allitas ugyanaz az alak, mint a migracional: nem az uzenetet nezi, hanem
    azt, hogy a szerver NEM indult el.
  */
  it("does not start the server when the shipping id check fails", () => {
    const { status, serverStarted } = runEntrypoint({ shippingIds: 1 })

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  it("starts the server when every check succeeds", () => {
    const { status, serverStarted } = runEntrypoint()

    expect(status).toBe(0)
    expect(serverStarted).toBe(true)
  })
})
