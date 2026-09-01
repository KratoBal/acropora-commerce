import {
  SHIPPING_OPTION_ROLE_BINDINGS,
  buildShippingOptionRoleMap,
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
