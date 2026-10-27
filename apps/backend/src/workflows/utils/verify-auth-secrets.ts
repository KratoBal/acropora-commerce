/**
 * ARE THE SIGNING SECRETS REAL? THE CHECK, AT THE ENTRYPOINT.
 *
 * === WHY THIS EXISTS (commerce-audit-2026-10-27, B5, P0) ===
 *
 * `medusa-config.ts` passes `JWT_SECRET` and `COOKIE_SECRET` straight through,
 * and `.env.template` ships both as `supersecret`. Nothing checked them at
 * start. If a deploy keeps the template value, or the variable is missing and
 * the framework falls back to its own default (the audit could not read the
 * framework to confirm that; it is an estimate, not a measurement), anybody who
 * knows the public default can sign a customer or admin session. The shop looks
 * healthy while that is true: the silence is the fault, not the variable.
 *
 * === WHAT COUNTS AS NOT REAL ===
 *
 * - missing or blank;
 * - shorter than 32 characters (the payment-link secret in this repo already
 *   requires 32: one rule for every signing secret);
 * - a known placeholder, case-insensitively: the template's `supersecret` and
 *   the usual stand-ins.
 *
 * The value is never printed, not even a prefix. The message names the
 * VARIABLE and the reason, which is all the person fixing the deploy needs.
 *
 * === WHY A SCRIPT AT THE ENTRYPOINT AND NOT THE CONFIG ===
 *
 * The same reason as the file-prefix check (`verify-file-backend-url.ts`):
 * `medusa-config.ts` is loaded by `medusa build`, which runs without runtime
 * environment, and a throw there would break the IMAGE BUILD in every
 * environment. The refusal belongs to the DEPLOY.
 */

/** The shortest secret accepted. */
export const MIN_SECRET_LENGTH = 32;

const SECRET_VARIABLES = ["JWT_SECRET", "COOKIE_SECRET"] as const;

/** Stand-ins that must never sign anything. Compared lower-cased. */
const PLACEHOLDERS = new Set([
  "supersecret",
  "secret",
  "changeme",
  "change-me",
  "password",
  "default",
]);

export type AuthSecretProblem = "missing" | "too-short" | "placeholder";

export type AuthSecretsCheck =
  | { ok: true }
  | {
      ok: false;
      problems: { variable: string; problem: AuthSecretProblem }[];
      message: string;
    };

export function verifyAuthSecrets(
  env: Record<string, string | undefined>
): AuthSecretsCheck {
  const problems: { variable: string; problem: AuthSecretProblem }[] = [];

  for (const variable of SECRET_VARIABLES) {
    const value = (env[variable] ?? "").trim();
    if (!value) problems.push({ variable, problem: "missing" });
    else if (PLACEHOLDERS.has(value.toLowerCase()))
      problems.push({ variable, problem: "placeholder" });
    else if (value.length < MIN_SECRET_LENGTH)
      problems.push({ variable, problem: "too-short" });
  }

  if (problems.length === 0) return { ok: true };
  return { ok: false, problems, message: describeAuthSecretProblems(problems) };
}

const REASON: Record<AuthSecretProblem, string> = {
  missing: "nincs beállítva",
  "too-short": `rövidebb ${MIN_SECRET_LENGTH} karakternél`,
  placeholder: "a sablon vagy egy ismert helyettesítő érték",
};

export function describeAuthSecretProblems(
  problems: { variable: string; problem: AuthSecretProblem }[]
): string {
  const lines = problems.map((p) => `${p.variable}: ${REASON[p.problem]}`);
  return (
    "A belépések aláírására szolgáló titok nem megfelelő, ezért a bolt " +
    "szándékosan nem indul el (" +
    lines.join("; ") +
    "). Állíts be minden érintett változóra egy véletlen, legalább " +
    `${MIN_SECRET_LENGTH} karakteres értéket. ÉS MIND A KETTŐBEN: a ` +
    "szerverben ÉS a feldolgozóban is, mert " +
    "ugyanabból a képből indulnak, és ez az ellenőrzés mind a kettőben " +
    "lefut. Az érték itt szándékosan nincs kiírva."
  );
}
