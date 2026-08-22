import { ShippingOptionRole } from "./shipping-eligibility"

/**
 * Which concrete shipping option plays which role.
 *
 * The mapping is by shipping option ID, never by name: display names are
 * translated and edited, ids are not. The `configure-shipping-rules` script and
 * the payment-eligibility resolver both read this one table, so they cannot
 * drift apart.
 *
 * Every id can be overridden by an environment variable, so the same code runs
 * against another environment without an edit.
 */
export type ShippingOptionRoleBinding = {
  role: ShippingOptionRole
  /** Only for logs and plan output. Never used as a decision input. */
  name: string
  id: string
  env: string
}

export const SHIPPING_OPTION_ROLE_BINDINGS: ShippingOptionRoleBinding[] = [
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

/** Resolves the bindings with any environment overrides applied. */
export const resolveShippingOptionRoleBindings = (
  env: NodeJS.ProcessEnv = process.env
): ShippingOptionRoleBinding[] =>
  SHIPPING_OPTION_ROLE_BINDINGS.map((binding) => ({
    ...binding,
    id: env[binding.env] ?? binding.id,
  }))

export const buildShippingOptionRoleMap = (
  env: NodeJS.ProcessEnv = process.env
): Map<string, ShippingOptionRole> =>
  new Map(
    resolveShippingOptionRoleBindings(env).map((binding) => [
      binding.id,
      binding.role,
    ])
  )
