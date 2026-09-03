import { resolveShippingOptionRoleBindings } from "./shipping-option-roles";

/**
 * DO THE SIX SHIPPING OPTION IDS ACTUALLY EXIST?
 *
 * === WHY THIS CHECK EXISTS AT ALL ===
 *
 * The role table binds six shipping options by id, and every id can be
 * overridden per environment. Those overrides are carried by hand: the seed
 * prints them, someone copies them into the environment.
 *
 * IF ONE IS MISSED, THE SHOP STARTS AND THE CHECKOUT QUIETLY DOES NOT WORK. The
 * ids then point at another environment's options, payment eligibility resolves
 * to an empty list, and the customer is offered no payment method. Nothing
 * fails, nothing is logged, and nobody finds out until an order does not happen.
 *
 * That silence is the whole problem - not the copying.
 *
 * === WHY IT REFUSES TO START RATHER THAN LOGGING ===
 *
 * A log line changes nothing: the shop still starts, the checkout is still
 * broken, and now there is a sentence nobody reads. Measured against the rule we
 * use elsewhere - which mistake stays hidden - refusing is LOUD (somebody says
 * "the shop will not start" within a minute) and logging is silent.
 *
 * The price of refusing is a stopped deploy, and that price is only fair if the
 * message says what to fix: which id, which variable, and where the value comes
 * from. A refusal without that is expensive.
 */

export interface ShippingOptionRoleVerification {
  /** Ids in the table that no shipping option in the database carries. */
  missing: { role: string; name: string; id: string; env: string }[];
  /** How many bindings were checked - zero would mean the table is empty. */
  checked: number;
}

/**
 * Compares the resolved bindings against the ids the database actually has.
 *
 * Pure on purpose: the query lives in the loader, the DECISION lives here, and
 * a decision that needs a running Postgres to be measured is a decision nobody
 * measures.
 */
export function verifyShippingOptionRoles(
  existingIds: readonly string[],
  env: NodeJS.ProcessEnv = process.env,
): ShippingOptionRoleVerification {
  const present = new Set(existingIds);
  const bindings = resolveShippingOptionRoleBindings(env);

  return {
    missing: bindings
      .filter((binding) => !present.has(binding.id))
      .map(({ role, name, id, env: variable }) => ({
        role,
        name,
        id,
        env: variable,
      })),
    checked: bindings.length,
  };
}

/**
 * The refusal message. Names every missing binding, its variable, and where the
 * value comes from - a stopped start with no instructions costs more than it
 * saves.
 */
export function describeMissingShippingOptions(
  verification: ShippingOptionRoleVerification,
): string {
  const lines = verification.missing.map(
    (m) => `  ${m.name} (${m.role}): ${m.env}=${m.id}`,
  );

  return [
    `A bolt nem indul el: ${verification.missing.length} szállítási mód azonosítója ` +
      `nem létezik ebben az adatbázisban (${verification.checked} kötésből ellenőrizve).`,
    ...lines,
    "",
    "A helyes értékeket a seed írja ki a futása végén " +
      "(backend:seed). Másold őket a környezetbe, és indítsd újra.",
    "Amíg ez nincs meg, a fizetési jogosultság üres listát adna, és a vevő nem " +
      "tudna fizetési módot választani - hibaüzenet nélkül.",
  ].join("\n");
}

/**
 * THE OTHER FAILURE, KEPT SEPARATE: the check itself could not run.
 *
 * "This id does not exist" and "I could not look" are different states with
 * different fixes, and a single message would hide the second behind the first.
 * The same shape as the empty offline cache on the phone: "I found no match" is
 * also true when nothing was searched.
 *
 * This one does NOT refuse. A shop stopped because its GUARD failed is worse
 * than one started without the guard: the guard is not the feature. It is loud
 * in the log and says plainly that the check did not happen.
 */
export function describeUncheckableShippingOptions(reason: string): string {
  return [
    "FIGYELEM: a szállítási módok azonosítóit NEM tudtam ellenőrizni indításkor.",
    `Az ok: ${reason}`,
    "A bolt elindul, de ez az indulás ELLENŐRZÉS NÉLKÜL történt - ha valamelyik " +
      "azonosító hibás, a kassza csendben nem fog működni.",
  ].join("\n");
}
