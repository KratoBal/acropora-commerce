import { execFileSync, spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
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
  /** `npx medusa db:migrate --execute-safe-links` */
  migrate?: number
  /** `npx medusa exec ./src/scripts/verify-links-in-sync.js` */
  links?: number
  /** `npx medusa exec ./src/scripts/verify-shipping-option-roles.js` */
  shippingIds?: number
}

type RunOptions = StepExitCodes & {
  /** This step never returns (sleeps far past the deadline), like a prompt. */
  hang?: "migrate" | "links" | "shippingIds"
  /** MEDUSA_STEP_TIMEOUT_SECONDS for the run. */
  stepTimeout?: number
  /** Run with a PATH that has no `timeout` binary on it. */
  withoutTimeoutBinary?: boolean
  /** RUN_MIGRATIONS for the run; unset when omitted. */
  runMigrations?: string
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
///
/// THE TWO `exec` STEPS ARE TOLD APART BY THE SCRIPT PATH, for the same reason:
/// one code for both would let the link check vanish without a red test.
/// The migrate step also records its arguments, so the flag that keeps the link
/// sync from ASKING can be asserted - a prompt in a container is a start that
/// never finishes, and no exit code would ever show it.
function runEntrypoint({
  fileUrl = 0,
  migrate = 0,
  links = 0,
  shippingIds = 0,
  hang,
  stepTimeout,
  withoutTimeoutBinary = false,
  runMigrations,
}: RunOptions = {}): {
  status: number | null
  serverStarted: boolean
  migrateArgs: string
  stderr: string
  elapsedMs: number
} {
  const dir = mkdtempSync(join(tmpdir(), "entrypoint-"))
  const marker = join(dir, "server-started")
  const migrateArgsFile = join(dir, "migrate-args")

  writeFileSync(
    join(dir, "npx"),
    [
      "#!/bin/sh",
      'case "$2" in',
      `  db:migrate) printf '%s' "$*" > ${migrateArgsFile}; ${hang === "migrate" ? "sleep 30; " : ""}exit ${migrate} ;;`,
      '  exec) case "$3" in',
      `    *verify-links-in-sync*) ${hang === "links" ? "sleep 30; " : ""}exit ${links} ;;`,
      `    *) ${hang === "shippingIds" ? "sleep 30; " : ""}exit ${shippingIds} ;;`,
      "  esac ;;",
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

  /*
    WITHOUT `timeout`: a PATH with only the fakes on it. The entrypoint's other
    commands are shell builtins, and the start command is given by absolute
    path, so the only thing this removes is the binary under test.
  */
  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PATH: withoutTimeoutBinary ? dir : `${dir}:${process.env.PATH ?? ""}`,
  }
  if (stepTimeout !== undefined) {
    env.MEDUSA_STEP_TIMEOUT_SECONDS = String(stepTimeout)
  }
  delete env.RUN_MIGRATIONS
  if (runMigrations !== undefined) {
    env.RUN_MIGRATIONS = runMigrations
  }

  const started = Date.now()
  const result = spawnSync(
    "/bin/sh",
    [ENTRYPOINT, "/bin/sh", "-c", `printf started > ${marker}`],
    { env, encoding: "utf8", timeout: 60_000 }
  )
  const elapsedMs = Date.now() - started

  let serverStarted = false
  try {
    execFileSync("/usr/bin/test", ["-f", marker])
    serverStarted = true
  } catch {
    serverStarted = false
  }

  let migrateArgs = ""
  try {
    migrateArgs = readFileSync(migrateArgsFile, "utf8")
  } catch {
    migrateArgs = ""
  }

  return {
    status: result.status,
    serverStarted,
    migrateArgs,
    stderr: result.stderr ?? "",
    elapsedMs,
  }
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
  /*
    A LINK-SZINKRON SOHA NEM KERDEZ. Zaszlo nelkul a `db:migrate` egy nem
    tisztan bovito link-valtozasnal interaktiv kerdest tesz fel, es egy
    kontenerben erre senki nem valaszol: 2026-09-28-an a stage hattere igy allt
    a 2.20.1 utan, es sosem indult el. Kilepesi kod nem jelzi, mert a folyamat
    nem lep ki - ezert az allitas az ARGUMENTUMOT nezi.

    Es a masik irany: az `--execute-all-links` torolhet link-tablat, arrol pedig
    nem egy felugyelet nelkuli indulas dont.
  */
  it("tells the migration to sync links without asking, and without deleting", () => {
    const { migrateArgs } = runEntrypoint()

    expect(migrateArgs).toContain("db:migrate")
    expect(migrateArgs).toContain("--execute-safe-links")
    expect(migrateArgs).not.toContain("--execute-all-links")
  })

  /*
    A BIZTONSAGOS SZINKRON MARADEKA HANGOS. Az `--execute-safe-links` a kihagyott
    link-modositast szo nelkul eldobja; az ellenorzes ezt fogja meg, es ha
    elbukik, a szerver NEM indul.
  */
  it("does not start the server when link changes were left pending", () => {
    const { status, serverStarted } = runEntrypoint({ links: 1 })

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  /*
    A HATARIDO. Egy kerdesre varo lepes nem lep ki, tehat kilepesi kod sem
    jelzi - 2026-09-28-an igy allt a stage. Az allitas harom resze: a szerver
    NEM indult, a futas a hataridon belul VEGET ERT (nem a teszt sajat 60 mp-es
    korlatja vagta el), es a hibauzenet megnevezi a lepest.

    Mind a harom Medusa-lepesre: egy kimaradt `run_step` pontosan az a lepes
    lenne, amelyik a kovetkezo kerdesnel orokre all.
  */
  it.each(["migrate", "links", "shippingIds"] as const)(
    "does not start the server when the %s step never returns",
    (hang) => {
      const { status, serverStarted, stderr, elapsedMs } = runEntrypoint({
        hang,
        stepTimeout: 1,
      })

      expect(status).toBe(124)
      expect(serverStarted).toBe(false)
      expect(elapsedMs).toBeLessThan(20_000)
      expect(stderr).toMatch(/did not finish within 1s - refusing to start/)
    }
  )

  /*
    CSAK EGY KONTENER MIGRAL. A szerver es a worker ugyanazt a kepet es belepesi
    pontot futtatja, es 2026-09-28-an MINDKETTO migralt, ugyanarra az
    adatbazisra, egyszerre. A workeren RUN_MIGRATIONS=false.

    A negy allitas egyutt a szabaly: alapbol migral; false-nal NEM migral, de
    elindul; false-nal a link-ellenorzes MEGIS lefut, es piros eseten nincs
    indulas; egy elgepelt ertek nem dont csendben egyik iranyba sem.
  */
  it("migrates by default, when RUN_MIGRATIONS is unset", () => {
    const { serverStarted, migrateArgs } = runEntrypoint()

    expect(migrateArgs).toContain("db:migrate")
    expect(serverStarted).toBe(true)
  })

  it("does not migrate with RUN_MIGRATIONS=false, and still starts", () => {
    const { status, serverStarted, migrateArgs } = runEntrypoint({
      runMigrations: "false",
    })

    expect(migrateArgs).toBe("")
    expect(status).toBe(0)
    expect(serverStarted).toBe(true)
  })

  it("still checks the link tables with RUN_MIGRATIONS=false, and refuses on a mismatch", () => {
    const { status, serverStarted, migrateArgs } = runEntrypoint({
      runMigrations: "false",
      links: 1,
    })

    expect(migrateArgs).toBe("")
    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
  })

  it.each(["False", "0", "no", ""])(
    "refuses to start on RUN_MIGRATIONS=%j instead of guessing",
    (value) => {
      const { status, serverStarted, migrateArgs, stderr } = runEntrypoint({
        runMigrations: value,
      })

      // Az ures ertek a `:-` miatt az alapertelmezest kapja: az MIGRAL.
      if (value === "") {
        expect(migrateArgs).toContain("db:migrate")
        expect(serverStarted).toBe(true)
        return
      }
      expect(migrateArgs).toBe("")
      expect(status).not.toBe(0)
      expect(serverStarted).toBe(false)
      expect(stderr).toMatch(/RUN_MIGRATIONS must be 'true' or 'false'/)
    }
  )

  it("refuses to start when the deadline itself is unavailable", () => {
    const { status, serverStarted, stderr } = runEntrypoint({
      withoutTimeoutBinary: true,
    })

    expect(status).not.toBe(0)
    expect(serverStarted).toBe(false)
    expect(stderr).toMatch(/'timeout' not found/)
  })

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
