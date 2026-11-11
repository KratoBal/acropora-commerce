import { webshopMailStartupNote } from "../workflows/utils/webshop-mail-config"

/**
 * IS THE SHOP'S MAIL ON? A REPORT, NEVER A REFUSAL. Runs at the entrypoint for the reasons `verify-file-backend-url.ts` gives
 * (plain node, no database, not in `medusa-config.ts`). Unlike the verify steps it NEVER stops the start: a shop without mail
 * is a legitimate state (production runs without it by default), it just must not be a silent one. The line says which case
 * ran, so a passing report cannot be told from one that never ran. The value of no key is printed, only the variable names.
 */
try {
  const note = webshopMailStartupNote(process.env)
  console.log(
    note
      ? `docker-entrypoint: FIGYELMEZTETÉS: ${note}`
      : "docker-entrypoint: a bolt levelezése be van kapcsolva (Gmail)."
  )
} catch (error) {
  console.log(`docker-entrypoint: a levelezés állapotát nem sikerült kiolvasni (${(error as Error)?.name ?? "hiba"}).`)
}
