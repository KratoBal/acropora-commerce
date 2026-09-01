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

/// Puts a fake `npx` first on PATH. It records that it ran, and exits with
/// the code the test asks for - which is exactly the signal the entrypoint
/// branches on.
function runEntrypoint(migrateExitCode: number): {
  status: number | null
  serverStarted: boolean
} {
  const dir = mkdtempSync(join(tmpdir(), "entrypoint-"))
  const marker = join(dir, "server-started")
  const fakeNpx = join(dir, "npx")

  writeFileSync(fakeNpx, `#!/bin/sh\nexit ${migrateExitCode}\n`)
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

  it("starts the server when the migration succeeds", () => {
    const { status, serverStarted } = runEntrypoint(0)

    expect(status).toBe(0)
    expect(serverStarted).toBe(true)
  })
})
