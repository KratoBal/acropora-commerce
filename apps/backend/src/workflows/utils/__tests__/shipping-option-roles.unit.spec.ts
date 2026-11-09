import {
  SHIPPING_OPTION_ROLE_BINDINGS,
  buildShippingOptionRoleMap,
  isStorePickupOption,
  resolveShippingOptionRoleBindings,
} from "../shipping-option-roles"

const envOf = (values: Record<string, string>): NodeJS.ProcessEnv =>
  values as unknown as NodeJS.ProcessEnv

const pickup = SHIPPING_OPTION_ROLE_BINDINGS.find(
  (binding) => binding.env === "ACROPORA_SO_PICKUP"
)!

describe("resolving shipping option ids from the environment", () => {
  it("keeps the built-in id when nothing overrides it", () => {
    const resolved = resolveShippingOptionRoleBindings(envOf({}))

    expect(resolved.find((b) => b.env === pickup.env)!.id).toBe(pickup.id)
  })

  it("takes a named override", () => {
    const resolved = resolveShippingOptionRoleBindings(
      envOf({ ACROPORA_SO_PICKUP: "so_another_environment" })
    )

    expect(resolved.find((b) => b.env === pickup.env)!.id).toBe(
      "so_another_environment"
    )
  })

  it("ignores an empty override instead of unmapping the option", () => {
    const resolved = resolveShippingOptionRoleBindings(
      envOf({ ACROPORA_SO_PICKUP: "" })
    )

    expect(resolved.find((b) => b.env === pickup.env)!.id).toBe(pickup.id)
  })

  it("ignores a whitespace-only override and trims a real one", () => {
    const blank = resolveShippingOptionRoleBindings(
      envOf({ ACROPORA_SO_PICKUP: "   " })
    )
    expect(blank.find((b) => b.env === pickup.env)!.id).toBe(pickup.id)

    const padded = resolveShippingOptionRoleBindings(
      envOf({ ACROPORA_SO_PICKUP: "  so_padded  " })
    )
    expect(padded.find((b) => b.env === pickup.env)!.id).toBe("so_padded")
  })

  it("still maps the role after an empty override, which is the point", () => {
    const map = buildShippingOptionRoleMap(envOf({ ACROPORA_SO_PICKUP: "" }))

    expect(map.get(pickup.id)).toBe(pickup.role)
    expect(map.has("")).toBe(false)
  })

  it("maps every binding, so an override cannot shrink the table", () => {
    const map = buildShippingOptionRoleMap(envOf({}))

    for (const binding of SHIPPING_OPTION_ROLE_BINDINGS) {
      expect(map.get(binding.id)).toBe(binding.role)
    }
  })
})

/*
  WHAT TURNS THIS RED (V0.3, the store pickup rule both readers share). The pickup option not recognised by its id; any
  OTHER role's option taken for a pickup (the GLS home delivery is not collected in the store); the environment's
  override ignored (a staging id would then never be a pickup); a missing, empty or non-string id taken for one; the
  rule matching by name.
*/
describe("isStorePickupOption", () => {
  it("is true for the pickup option's id and false for every other role's option", () => {
    expect(isStorePickupOption(pickup.id, envOf({}))).toBe(true)
    for (const other of SHIPPING_OPTION_ROLE_BINDINGS.filter((b) => b.role !== "PICKUP"))
      expect(isStorePickupOption(other.id, envOf({}))).toBe(false)
  })

  it("follows the environment's override of the pickup id, and drops the built-in one then", () => {
    const env = envOf({ ACROPORA_SO_PICKUP: "so_another_environment" })
    expect(isStorePickupOption("so_another_environment", env)).toBe(true)
    expect(isStorePickupOption(pickup.id, env)).toBe(false)
  })

  it("is false for a missing, empty or non-string id, and for the option's NAME", () => {
    for (const value of [undefined, null, "", 0, {}, pickup.name])
      expect(isStorePickupOption(value, envOf({}))).toBe(false)
  })
})
