import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { batchShippingOptionRulesWorkflow } from "@medusajs/medusa/core-flows"

import {
  SHIPPING_CLASS_RULE_ATTRIBUTE,
  ruleForRole,
} from "../workflows/utils/shipping-eligibility"
import { resolveShippingOptionRoleBindings } from "../workflows/utils/shipping-option-roles"

/**
 * Applies the `shipping_class` rules to the Acropora shipping options.
 *
 * DRY RUN BY DEFAULT. It prints the exact plan and changes nothing unless it is
 * called with `--apply`:
 *
 *   npx medusa exec ./src/scripts/configure-shipping-rules.ts          # plan only
 *   npx medusa exec ./src/scripts/configure-shipping-rules.ts apply    # apply
 *
 * Both `apply` and `--apply` are accepted: the CLI does not always forward a
 * leading `--`, so the positional form is the one that reliably arrives.
 *
 * Idempotent: an option whose `shipping_class` rule already matches is left
 * alone, and re-running produces an empty plan.
 *
 * It touches ONLY rules whose attribute is `shipping_class`. The existing
 * `enabled_in_store` and `is_return` rules are never read back and rewritten,
 * so nothing else can be lost. This is why it uses
 * `batchShippingOptionRulesWorkflow` rather than updating the shipping option:
 * updating an option REPLACES its whole rules array, and a rule omitted from
 * that array is deleted.
 */

/**
 * The option ids and their roles live in
 * `src/workflows/utils/shipping-option-roles.ts`, shared with the payment
 * eligibility resolver. One table, so the two cannot drift apart, and every id
 * stays overridable by an environment variable.
 */

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(Array.isArray(a) ? [...a].sort() : a) ===
  JSON.stringify(Array.isArray(b) ? [...b].sort() : b)

export default async function configureShippingRules({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillment = container.resolve(Modules.FULFILLMENT)

  const apply = (args ?? []).includes("--apply") || (args ?? []).includes("apply")

  const targets = resolveShippingOptionRoleBindings()

  const options = await fulfillment.listShippingOptions(
    { id: targets.map((t) => t.id) },
    { relations: ["rules"] }
  )

  const optionsById = new Map(options.map((o: any) => [o.id, o]))

  type RuleDraft = ReturnType<typeof ruleForRole>

  const create: (RuleDraft & { shipping_option_id: string })[] = []
  const update: (RuleDraft & { id: string })[] = []
  const missing: string[] = []

  logger.info("--- shipping_class rule plan ---")

  for (const target of targets) {
    const option: any = optionsById.get(target.id)

    if (!option) {
      missing.push(`${target.name} (${target.id})`)
      logger.error(`MISSING  ${target.name} (${target.id}) was not found`)
      continue
    }

    const desired = ruleForRole(target.role)
    const existing = (option.rules ?? []).find(
      (rule: any) => rule.attribute === SHIPPING_CLASS_RULE_ATTRIBUTE
    )

    const desiredText = `${desired.operator} ${JSON.stringify(desired.value)}`

    if (!existing) {
      create.push({ shipping_option_id: option.id, ...desired })
      logger.info(`CREATE   ${target.name}: ${SHIPPING_CLASS_RULE_ATTRIBUTE} ${desiredText}`)
      continue
    }

    if (
      existing.operator === desired.operator &&
      sameValue(existing.value, desired.value)
    ) {
      logger.info(`OK       ${target.name}: already ${desiredText}`)
      continue
    }

    update.push({ id: existing.id, ...desired })
    logger.info(
      `UPDATE   ${target.name}: ${existing.operator} ${JSON.stringify(existing.value)} -> ${desiredText}`
    )
  }

  logger.info(
    `--- plan: ${create.length} create, ${update.length} update, 0 delete, ${missing.length} missing ---`
  )

  if (missing.length) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Refusing to continue: shipping options not found: ${missing.join(", ")}`
    )
  }

  if (!create.length && !update.length) {
    logger.info("Nothing to do.")
    return
  }

  if (!apply) {
    logger.info("DRY RUN. Nothing was changed. Re-run with -- --apply to apply.")
    return
  }

  await batchShippingOptionRulesWorkflow(container).run({
    input: { create, update, delete: [] },
  })

  logger.info("Applied.")
}
