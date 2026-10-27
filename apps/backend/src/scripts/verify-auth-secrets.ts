import { verifyAuthSecrets } from "../workflows/utils/verify-auth-secrets"

/**
 * ARE THE SIGNING SECRETS REAL? Runs at the entrypoint, before the migration,
 * for the reasons `verify-file-backend-url.ts` gives (no database, no
 * application, fastest refusal first, and not in `medusa-config.ts` because the
 * image build loads that without runtime environment).
 *
 * The success line is not decoration: without it a passing check cannot be told
 * from one that never ran. It says that the check ran, never what the values are.
 */
const check = verifyAuthSecrets(process.env)

if (!check.ok) {
  console.error(`HIBA: ${check.message}`)
  process.exit(1)
}

console.log("docker-entrypoint: a belépések aláíró titkai rendben (jelenlét és hossz).")
