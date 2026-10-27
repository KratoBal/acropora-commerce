import { verifyStripeWebhookSecret } from "../workflows/utils/verify-stripe-webhook-secret"

/**
 * IS THE STRIPE WEBHOOK SECRET SET WHENEVER THE CARD KEY IS? Runs at the
 * entrypoint for the reasons `verify-file-backend-url.ts` gives (plain node, no
 * database, not in `medusa-config.ts`). The success line says which case ran, so
 * a passing check cannot be told from one that never ran.
 */
const check = verifyStripeWebhookSecret(process.env)

if (!check.ok) {
  console.error(`HIBA: ${check.message}`)
  process.exit(1)
}

console.log(
  check.stripe
    ? "docker-entrypoint: a Stripe visszajelzés titka be van állítva."
    : "docker-entrypoint: nincs Stripe kulcs, a kártyás fizetés nincs regisztrálva."
)
