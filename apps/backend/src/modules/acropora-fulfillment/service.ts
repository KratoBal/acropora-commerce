import {
  CalculatedShippingOptionPrice,
  CalculateShippingOptionPriceDTO,
  CreateFulfillmentResult,
  CreateShippingOptionDTO,
  FulfillmentOption,
  ValidateFulfillmentDataContext,
} from "@medusajs/framework/types"
import {
  AbstractFulfillmentProviderService,
  MedusaError,
} from "@medusajs/framework/utils"

import {
  CommerceSettingsService,
  getShippingPricingSettings,
} from "../commerce-settings/accessor"
import { calculateGoodsTotal } from "../../workflows/utils/goods-total"
import { ShippingOptionRole } from "../../workflows/utils/shipping-eligibility"
import {
  buildShippingOptionRoleMap,
  glsPointOptionOf,
  resolveShippingOptionRoleBindings,
} from "../../workflows/utils/shipping-option-roles"
import { calculateShippingPrice } from "../../workflows/utils/shipping-pricing"
import {
  FoxpostPickupPoint,
  FoxpostPickupPointsService,
} from "../../services/foxpost-pickup-points"
import {
  GlsPickupPointsService,
  glsPointAddress,
  glsPointAllowed,
} from "../../services/gls-pickup-points"
import { linesForCourierPrice } from "../../workflows/utils/split-pricing-context"

const optionRole = (
  optionData: Record<string, unknown>,
): ShippingOptionRole => {
  const optionId = optionData.id

  if (typeof optionId !== "string") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Acropora shipping option data must contain a string id",
    )
  }

  const role = buildShippingOptionRoleMap().get(optionId)

  if (!role) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      `Unknown Acropora shipping option id: ${optionId}`,
    )
  }

  return role
}

const isKnownOption = (optionData: unknown): boolean => {
  if (!optionData || typeof optionData !== "object") {
    return false
  }

  try {
    optionRole(optionData as Record<string, unknown>)
    return true
  } catch {
    return false
  }
}

const selectedFoxpostPickupPointId = (data: Record<string, unknown>): string => {
  const pickupPoint = data.foxpost_pickup_point

  if (!pickupPoint || typeof pickupPoint !== "object") {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Foxpost fulfillment data must contain foxpost_pickup_point",
    )
  }

  const id = Reflect.get(pickupPoint, "id")

  if (typeof id !== "string" || id.trim().length === 0) {
    throw new MedusaError(
      MedusaError.Types.INVALID_DATA,
      "Foxpost fulfillment data must contain a pickup-point id",
    )
  }

  return id
}

/**
 * What the order keeps of the point, from Foxpost's directory, never from the
 * browser. The type travels with it (the confirmation and the OS name a Z-Pont
 * a Z-Pont), and what it accepts and does, for the success page.
 */
/*
  WHAT THE ORDER KEEPS (the Foxpost prompt, point 19). The first six keys are
  the ones read today (the OS, the mails, the success page) and do not change;
  the rest is the point's record for the type's icon, the opening hours, and
  which picker it came from. All of it from our own copy of Foxpost's list;
  from the browser only the id, and the picker.
*/
const persistedFoxpostPickupPoint = (
  pickupPoint: FoxpostPickupPoint,
  source: "finder" | "fallback",
) => ({
  foxpost_pickup_point: {
    id: pickupPoint.id,
    name: pickupPoint.name,
    address: pickupPoint.address,
    variant: pickupPoint.variant,
    payment_options: pickupPoint.payment_options,
    services: pickupPoint.services,
    provider: "foxpost",
    zip: pickupPoint.zip,
    city: pickupPoint.city,
    icon_url: pickupPoint.icon_url,
    opening_hours: pickupPoint.opening_hours,
    source,
  },
})

type CalculableShippingOption = CreateShippingOptionDTO & { id?: string }

const carriesNoOptionData = (data: unknown): boolean => {
  if (data === undefined || data === null) {
    return true
  }

  return typeof data === "object" && Object.keys(data as object).length === 0
}

const hasMatchingOptionDataId = (shippingOption: CalculableShippingOption) => {
  // CREATION IS ASKED BEFORE THERE IS ANYTHING TO MATCH AGAINST. Medusa runs
  // `validateShippingOptionsForPriceCalculation` inside the create workflow,
  // and the option id only exists once that workflow has finished. An option
  // being created therefore carries no `data.id`, and demanding a known one
  // here is a condition nothing can satisfy: it is what stopped the live seed
  // from creating the five calculated options at all.
  //
  // The trailing `!shippingOption.id` below already encoded this intent, but it
  // sat BEHIND the `isKnownOption` gate and so could never be reached.
  //
  // This stays a check that can still fail: data supplied at creation must name
  // a known option. Only the absence of data is waived, never a wrong value.
  if (!shippingOption.id) {
    return (
      carriesNoOptionData(shippingOption.data) ||
      isKnownOption(shippingOption.data)
    )
  }

  // AZ AZONOSITOVAL RENDELKEZO OPCIONAL A KERDES AZ ONHIVATKOZAS, NEM A KOTES.
  //
  // Az eredeti alak azt kovetelte, hogy a `data.id` egy MAR ISMERT opciot
  // nevezzen, vagyis hogy a hat kornyezeti valtozo egyike mar erre az
  // azonositora alljon. A seed viszont pont azt a visszairast vegzi, amivel az
  // opcio eloszor megkapja a sajat azonositojat -- olyankor, amikor a valtozok
  // meg uresek, mert az ERTEKUK ez az azonosito. A kotest kovetelni itt
  // ugyanaz a kor, mint a letrehozasnal, csak egy lepessel kesobb: eles futason
  // ezen hasalt el az onhivatkozas, `Cannot calcuate pricing for: []` alakban.
  //
  // Amit itt ellenorizni LEHET, az az onhivatkozas: a `data.id` UGYANAZ az
  // opcio legyen. Ez tovabbra is elutasit minden idegen es minden hianyzo
  // erteket, es a mai negy allitas kozul egyet sem enged at.
  //
  // A KOTEST NEM ITT ORIZZUK, ES NEM IS ITT KELL: a `calculatePrice` ismeretlen
  // azonositora hibat dob, tehat kasszan arat szamolni tovabbra sem lehet
  // kotetlen opciora.
  const optionDataId = (shippingOption.data as Record<string, unknown> | null)
    ?.id

  return typeof optionDataId === "string" && shippingOption.id === optionDataId
}

/**
 * Calculated-price provider for Acropora's existing manually executed shipping
 * methods. Carrier booking and label handling deliberately remain no-ops.
 */
class AcroporaFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "acropora"

  protected readonly commerceSettings_: CommerceSettingsService
  protected readonly foxpostPickupPoints_: FoxpostPickupPointsService
  protected readonly glsPickupPoints_: GlsPickupPointsService

  constructor(
    dependencies: {
      commerce_settings: CommerceSettingsService
      foxpostPickupPoints?: FoxpostPickupPointsService
      glsPickupPoints?: GlsPickupPointsService
    },
  ) {
    super()
    this.commerceSettings_ = dependencies.commerce_settings
    this.foxpostPickupPoints_ = Object.prototype.hasOwnProperty.call(
      dependencies,
      "foxpostPickupPoints",
    )
      ? dependencies.foxpostPickupPoints ?? new FoxpostPickupPointsService()
      : new FoxpostPickupPointsService()
    // The same guard as above: the module loader passes an awilix cradle, and
    // reading an unregistered key from it THROWS (measured by the "pickup at
    // zero" test, which builds the provider from an isolated cradle).
    this.glsPickupPoints_ = Object.prototype.hasOwnProperty.call(
      dependencies,
      "glsPickupPoints",
    )
      ? dependencies.glsPickupPoints ?? new GlsPickupPointsService()
      : new GlsPickupPointsService()
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    const availability = await this.foxpostPickupPoints_.getAvailability()

    return resolveShippingOptionRoleBindings()
      .filter(({ role }) => role !== "FOXPOST" || availability.available)
      .map(({ id, name }) => ({
        id,
        name,
      }))
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext,
  ): Promise<Record<string, unknown>> {
    const role = optionRole(optionData)

    const glsPoint = glsPointOptionOf(String(optionData.id))
    if (glsPoint) {
      return this.validateGlsPickupPoint(data, glsPoint.heavy)
    }

    if (role !== "FOXPOST") {
      return data
    }

    const availability = await this.foxpostPickupPoints_.getAvailability()

    if (!availability.available) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Foxpost shipping is currently unavailable",
      )
    }

    const pickupPointId = selectedFoxpostPickupPointId(data)
    const findIn = (points: FoxpostPickupPoint[]) =>
      points.find((candidate) => candidate.id === pickupPointId)
    let pickupPoint = findIn(availability.pickup_points)

    // a point newer than our copy (chosen in the official finder): the list
    // is read again once before the point is refused (the prompt, point 6)
    if (!pickupPoint) {
      const fresh = await this.foxpostPickupPoints_.getAvailability({ refresh: true })
      if (fresh.available) pickupPoint = findIn(fresh.pickup_points)
    }

    if (!pickupPoint) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected Foxpost pickup point is unavailable",
      )
    }

    const chosen = data.foxpost_pickup_point as { source?: unknown }
    return persistedFoxpostPickupPoint(
      pickupPoint,
      chosen.source === "finder" ? "finder" : "fallback",
    )
  }

  /**
   * A GLS PICKUP-POINT OPTION NEEDS A POINT (P4), like Foxpost: the id comes
   * from the browser, everything stored comes from our own copy of GLS's list.
   * A heavy parcel goes only to a parcel shop (`glsPointAllowed`). Both GLS ids
   * are kept: label printing (MyGLS) needs one of them, and it is not yet known
   * which (acrobot, 2026-09-29).
   */
  private async validateGlsPickupPoint(
    data: Record<string, unknown>,
    heavy: boolean,
  ): Promise<Record<string, unknown>> {
    const chosen = data.gls_pickup_point
    const id =
      chosen && typeof chosen === "object" ? Reflect.get(chosen, "id") : undefined

    if (typeof id !== "string" || !id.trim()) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "GLS pickup-point shipping needs a gls_pickup_point id",
      )
    }

    const availability = await this.glsPickupPoints_.getAvailability()

    if (!availability.available) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "GLS pickup points are currently unavailable",
      )
    }

    const point = availability.pickup_points.find((candidate) => candidate.id === id)

    if (!point || !glsPointAllowed(point, heavy)) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected GLS pickup point is unavailable for this shipping method",
      )
    }

    /*
      WHAT THE ORDER KEEPS (the GLS prompt, point 4). The first five keys are
      the ones the OS reads today (nautilus: `type` gives ParcelShop or
      locker) and do not change; the rest is the point's full record, for the
      selected-point block, the success page and the label. All of it from our
      own copy of GLS's list; from the browser only the id, and which picker
      it came from.
    */
    const source = Reflect.get(chosen as object, "source")
    return {
      gls_pickup_point: {
        id: point.id,
        gold_id: point.gold_id,
        name: point.name,
        address: glsPointAddress(point),
        type: point.type,
        zip: point.zip,
        city: point.city,
        street: point.address,
        hours: point.hours,
        features: point.features,
        has_wheelchair_access: point.has_wheelchair_access,
        locker_saturation: point.locker_saturation,
        external_id: point.external_id,
        source: source === "finder" ? "finder" : "fallback",
      },
    }
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return isKnownOption(data)
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    return data.price_type === "calculated" && hasMatchingOptionDataId(data)
  }

  async calculatePrice(
    optionData: CalculateShippingOptionPriceDTO["optionData"],
    _data: CalculateShippingOptionPriceDTO["data"],
    context: CalculateShippingOptionPriceDTO["context"],
  ): Promise<CalculatedShippingOptionPrice> {
    const role = optionRole(optionData)

    // Pickup must remain available even if a carrier setting is unavailable.
    if (role === "PICKUP") {
      return {
        calculated_amount: 0,
        is_calculated_price_tax_inclusive: true,
      }
    }

    // A mixed cart's pickup lines become their own order (P4-2): the courier
    // price and its threshold count only the lines that ship.
    const goodsTotalHuf = calculateGoodsTotal(
      linesForCourierPrice(
        context.items,
        context as unknown as Record<string, unknown>,
      ),
    )
    const settings = await getShippingPricingSettings(this.commerceSettings_)
    const calculatedAmount = calculateShippingPrice({
      role,
      goodsTotalHuf,
      settings,
    })

    return {
      calculated_amount: calculatedAmount,
      is_calculated_price_tax_inclusive: true,
    }
  }

  async createFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }

  async cancelFulfillment(): Promise<Record<string, never>> {
    return {}
  }

  async createReturnFulfillment(): Promise<CreateFulfillmentResult> {
    return { data: {}, labels: [] }
  }
}

export default AcroporaFulfillmentService
