import {
  allowedPaymentProvidersFor,
  buildProviderRoleMap,
} from "../payment-providers"
import { allowedPaymentRolesFor } from "../payment-eligibility"

/**
 * The environment of a live-like installation: cash on delivery and the
 * built-in provider are mapped, online card is not, because no SimplePay
 * provider is registered yet.
 */
const ELES_KORNYEZET = {
  ACROPORA_PP_COD: "pp_acropora_cod",
  ACROPORA_PP_PAY_AT_STORE: "pp_system_default",
} as NodeJS.ProcessEnv

describe("which providers a cart may pay with", () => {
  it("a heavy delivery offers cash on delivery, and nothing else that is mapped", () => {
    const roles = allowedPaymentRolesFor(["GLS_HEAVY"])

    expect(roles).toEqual(["ONLINE_CARD", "COD"])
    expect(
      allowedPaymentProvidersFor(roles, buildProviderRoleMap(ELES_KORNYEZET))
    ).toEqual([{ id: "pp_acropora_cod", role: "COD" }])
  })

  /**
   * THE OTHER HALF OF THE SAME MEASUREMENT, and the reason this test file
   * exists: without it, an implementation that returns every mapped provider
   * would pass the assertion above, because the live map happens to hold the
   * cash-on-delivery provider.
   */
  it("store pickup offers paying in the shop, and NOT cash on delivery", () => {
    const roles = allowedPaymentRolesFor(["PICKUP"])

    expect(roles).toEqual(["ONLINE_CARD", "PAY_AT_STORE"])
    expect(
      allowedPaymentProvidersFor(roles, buildProviderRoleMap(ELES_KORNYEZET))
    ).toEqual([{ id: "pp_system_default", role: "PAY_AT_STORE" }])
  })

  it("a cart with no shipping method chosen may pay with nothing", () => {
    expect(
      allowedPaymentProvidersFor(
        allowedPaymentRolesFor([]),
        buildProviderRoleMap(ELES_KORNYEZET)
      )
    ).toEqual([])
  })

  /**
   * An allowed role with no provider is not an error and not a gap to be
   * filled with a guess: it yields nothing. A storefront that renders this
   * empty list shows "there is nothing you can pay with here", which is the
   * truth about a cart whose only allowed role is online card today.
   */
  it("an allowed role with no provider yields no entry", () => {
    const roles = allowedPaymentRolesFor(["GLS_HEAVY"])

    expect(roles).toContain("ONLINE_CARD")
    expect(allowedPaymentProvidersFor(roles, buildProviderRoleMap({}))).toEqual(
      []
    )
  })

  /**
   * The order is taken from PAYMENT_ROLES, not from the map. An environment
   * variable added later would otherwise move the entries around in the
   * response for no reason a reader could see.
   */
  it("orders the entries by payment role, not by how the map was filled", () => {
    const forditott = new Map(
      Object.entries({
        pp_system_default: "PAY_AT_STORE",
        pp_acropora_cod: "COD",
      })
    ) as Map<string, "PAY_AT_STORE" | "COD">

    expect(
      allowedPaymentProvidersFor(["COD", "PAY_AT_STORE"], forditott)
    ).toEqual([
      { id: "pp_acropora_cod", role: "COD" },
      { id: "pp_system_default", role: "PAY_AT_STORE" },
    ])
  })
})
