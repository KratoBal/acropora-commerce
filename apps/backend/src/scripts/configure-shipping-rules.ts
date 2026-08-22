import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  MedusaError,
  Modules,
} from "@medusajs/framework/utils"
import { batchShippingOptionRulesWorkflow } from "@medusajs/medusa/core-flows"

import {
  SHIPPING_CLASS_RULE_ATTRIBUTE,
  ShippingOptionRole,
  ruleForRole,
} from "../workflows/utils/shipping-eligibility"

/**
 * Applies the `shipping_class` rules to the Acropora shipping options.
 *
 * DRY RUN BY DEFAULT. It prints the exact plan and changes nothing unless it is
 * called with `--apply`:
 *
 *   npx medusa exec ./src/scripts/configure-shipping-rules.ts            # plan only
 *   npx medusa exec ./src/scripts/configure-shipping-rules.ts -- --apply # apply
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
 * Stage shipping-option ids, from the Phase 3 brief. Each can be overridden by
 * an environment variable so the same script works against another environment
 * without editing code.
 */
const OPTION_ROLES: {
  role: ShippingOptionRole
  name: string
  id: string
  env: string
}[] = [
  {
    role: "PICKUP",
    name: "Bolti átvétel",
    id: "so_01M0K5AFG6M5PDEKCQYW2FNBQZ",
    env: "ACROPORA_SO_PICKUP",
  },
  {
    role: "GLS_NORMAL",
    name: "GLS házhozszállítás",
    id: "so_01M0K6P7P1Z9XQQANXE2FRATR7",
    env: "ACROPORA_SO_GLS_HOME",
  },
  {
    role: "GLS_NORMAL",
    name: "GLS csomagpont",
    id: "so_01M0K6W1873VS64WAPQZM7H8KH",
    env: "ACROPORA_SO_GLS_POINT",
  },
  {
    role: "GLS_HEAVY",
    name: "GLS nehézáru házhozszállítás",
    id: "so_01M0K73C9TZZV3ETP02F66HJVG",
    env: "ACROPORA_SO_GLS_HEAVY_HOME",
  },
  {
    role: "GLS_HEAVY",
    name: "GLS nehézáru csomagpont",
    id: "so_01M0K7547Z7DNE7CNA86A2FFJ6",
    env: "ACROPORA_SO_GLS_HEAVY_POINT",
  },
  {
    role: "FOXPOST",
    name: "Foxpost csomagpont",
    id: "so_01M0K783R7D71AKJXC5D0SQ1SN",
    env: "ACROPORA_SO_FOXPOST",
  },
]

const sameValue = (a: unknown, b: unknown) =>
  JSON.stringify(Array.isArray(a) ? [...a].sort() : a) ===
  JSON.stringify(Array.isArray(b) ? [...b].sort() : b)

export default async function configureShippingRules({
  container,
  args,
}: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const fulfillment = container.resolve(Modules.FULFILLMENT)

  const apply = (args ?? []).includes("--apply")

  const targets = OPTION_ROLES.map((target) => ({
    ...target,
    id: process.env[target.env] ?? target.id,
  }))

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
