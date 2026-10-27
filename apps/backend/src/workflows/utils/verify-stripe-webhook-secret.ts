/**
 * A CARD KEY WITHOUT A WEBHOOK SECRET MUST NOT START (commerce-audit-2026-10-27,
 * B7 / F1, P0).
 *
 * === WHY THIS EXISTS ===
 *
 * `stripe-config.ts` registers the card provider whenever STRIPE_API_KEY is set,
 * and passes STRIPE_WEBHOOK_SECRET along only if there is one. Without it the
 * package merely warns, and the warning is the whole safety: with 3-D Secure or
 * an asynchronous payment the money can be taken while the order is never
 * updated by the webhook. The customer paid, the shop shows an unpaid order.
 * Nothing fails at start; the first person to notice is the customer.
 *
 * === WHAT IT REFUSES, AND WHAT IT DOES NOT ===
 *
 * Refuses: a key present and the secret missing or blank. Allowed: no key at all
 * (cash on delivery and advance transfer shops run without Stripe, and
 * `stripeProviders` already registers nothing then). Presence only: this does
 * not guess what a secret looks like; whether Stripe accepts it is Stripe's to
 * say at the first signed event.
 *
 * The value is never printed. The message names the VARIABLE.
 *
 * === WHY AN ENTRYPOINT STEP AND NOT THE CONFIG ===
 *
 * The same reason as the other two entrypoint checks (`verify-file-backend-url`,
 * `verify-auth-secrets`): `medusa-config.ts` is loaded by `medusa build`, which
 * runs without runtime environment, and a throw there would break the IMAGE
 * BUILD everywhere. The refusal belongs to the DEPLOY.
 */

export type StripeWebhookSecretCheck =
  | { ok: true; stripe: boolean }
  | { ok: false; message: string };

export function verifyStripeWebhookSecret(
  env: Record<string, string | undefined>
): StripeWebhookSecretCheck {
  const key = (env.STRIPE_API_KEY ?? "").trim();
  if (!key) return { ok: true, stripe: false };

  const secret = (env.STRIPE_WEBHOOK_SECRET ?? "").trim();
  if (secret) return { ok: true, stripe: true };

  return {
    ok: false,
    message:
      "A STRIPE_API_KEY be van állítva, de a STRIPE_WEBHOOK_SECRET nincs, ezért " +
      "a bolt szándékosan nem indul el: a 3-D Secure és az aszinkron fizetések " +
      "a visszajelzés nélkül levonhatják a pénzt úgy, hogy a rendelés nem frissül. " +
      "Állítsd be a Stripe webhook aláíró titkát (a Stripe felületén a " +
      "<backend>/hooks/payment/stripe_stripe végponthoz tartozik), vagy vedd " +
      "ki a STRIPE_API_KEY-t, ha kártyás fizetés nem kell. ÉS MIND A KETTŐBEN: a " +
      "szerverben ÉS a feldolgozóban is, mert ugyanabból a képből indulnak, és " +
      "ez az ellenőrzés mind a kettőben lefut. Az érték itt szándékosan nincs kiírva.",
  };
}
