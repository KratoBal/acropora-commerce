import {
  allowedPaymentProvidersFor,
  buildProviderRoleMap,
  onlineCardProviderIds,
  providersForMixedCart,
} from "../payment-providers"
import { allowedPaymentRolesFor } from "../payment-eligibility"

/**
 * The environment of an installation without STRIPE_API_KEY: cash on delivery
 * and the built-in provider are mapped, online card is not.
 */
const ELES_KORNYEZET = {
  ACROPORA_PP_COD: "pp_acropora_cod",
  ACROPORA_PP_PAY_AT_STORE: "pp_system_default",
} as NodeJS.ProcessEnv

describe("which providers a cart may pay with", () => {
  it("a heavy delivery offers cash on delivery, and nothing else that is mapped", () => {
    const roles = allowedPaymentRolesFor(["GLS_HEAVY"])

    expect(roles).toEqual(["ONLINE_CARD", "COD", "BANK_TRANSFER"])
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

    expect(roles).toEqual(["ONLINE_CARD", "PAY_AT_STORE", "BANK_TRANSFER"])
    expect(
      allowedPaymentProvidersFor(roles, buildProviderRoleMap(ELES_KORNYEZET))
    ).toEqual([{ id: "pp_system_default", role: "PAY_AT_STORE" }])
  })

  /*
    PREPAYMENT BY BANK TRANSFER (bb3a6bd5) is its own provider: once it is
    mapped, it is offered next to the others, and it never takes the system
    provider's place (pay-at-store keeps that, an id belongs to one role).
  */
  it("a mapped transfer provider is offered beside the others, and pay-at-store keeps the system one", () => {
    const env = {
      ...ELES_KORNYEZET,
      ACROPORA_PP_BANK_TRANSFER: "pp_acropora_transfer",
    } as NodeJS.ProcessEnv
    const map = buildProviderRoleMap(env)
    expect(
      allowedPaymentProvidersFor(allowedPaymentRolesFor(["PICKUP"]), map)
    ).toEqual([
      { id: "pp_system_default", role: "PAY_AT_STORE" },
      { id: "pp_acropora_transfer", role: "BANK_TRANSFER" },
    ])
    expect(
      allowedPaymentProvidersFor(allowedPaymentRolesFor(["FOXPOST"]), map)
    ).toEqual([
      { id: "pp_acropora_cod", role: "COD" },
      { id: "pp_acropora_transfer", role: "BANK_TRANSFER" },
    ])
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

/**
 * STRIPE, THE ONLY CARD PROVIDER (Balázs 2026-10-05). What must fail: Stripe
 * not offered; a mixed cart offered a card while the Stripe lock is shut, or
 * offered any card provider other than Stripe (the split at completion cannot
 * pay it); the lock open and Stripe still missing.
 */
describe("the card provider", () => {
  const KARTYA = {
    ...ELES_KORNYEZET,
    // listed twice and padded: one id, trimmed
    ACROPORA_PP_ONLINE_CARD: " pp_stripe_stripe , pp_masik_kartya,pp_stripe_stripe ",
  } as NodeJS.ProcessEnv

  it("Stripe is offered, in the listed order", () => {
    expect(onlineCardProviderIds(KARTYA)).toEqual(["pp_stripe_stripe", "pp_masik_kartya"])
    expect(
      allowedPaymentProvidersFor(
        allowedPaymentRolesFor(["PICKUP"]),
        buildProviderRoleMap(KARTYA)
      )
    ).toEqual([
      { id: "pp_stripe_stripe", role: "ONLINE_CARD" },
      { id: "pp_masik_kartya", role: "ONLINE_CARD" },
      { id: "pp_system_default", role: "PAY_AT_STORE" },
    ])
  })

  it("a mixed cart gets Stripe only with the lock open, and never another card", () => {
    const offer = allowedPaymentProvidersFor(
      allowedPaymentRolesFor(["PICKUP"]),
      buildProviderRoleMap(KARTYA)
    )

    expect(providersForMixedCart(offer, true, KARTYA)).toEqual([
      { id: "pp_system_default", role: "PAY_AT_STORE" },
    ])
    expect(
      providersForMixedCart(offer, true, { ...KARTYA, ACROPORA_STRIPE_MIXED_CART: "true" })
    ).toEqual([
      { id: "pp_stripe_stripe", role: "ONLINE_CARD" },
      { id: "pp_system_default", role: "PAY_AT_STORE" },
    ])
    expect(providersForMixedCart(offer, false, KARTYA)).toEqual(offer)
  })
})
