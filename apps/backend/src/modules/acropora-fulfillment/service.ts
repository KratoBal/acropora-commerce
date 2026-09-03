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
  resolveShippingOptionRoleBindings,
} from "../../workflows/utils/shipping-option-roles"
import { calculateShippingPrice } from "../../workflows/utils/shipping-pricing"
import {
  FoxpostPickupPoint,
  FoxpostPickupPointsService,
} from "../../services/foxpost-pickup-points"

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

const persistedFoxpostPickupPoint = (pickupPoint: FoxpostPickupPoint) => ({
  foxpost_pickup_point: {
    id: pickupPoint.id,
    name: pickupPoint.name,
    address: pickupPoint.address,
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

  constructor(
    dependencies: {
      commerce_settings: CommerceSettingsService
      foxpostPickupPoints?: FoxpostPickupPointsService
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
    const pickupPoint = availability.pickup_points.find(
      (candidate) => candidate.id === pickupPointId,
    )

    if (!pickupPoint) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "The selected Foxpost pickup point is unavailable",
      )
    }

    return persistedFoxpostPickupPoint(pickupPoint)
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

    const goodsTotalHuf = calculateGoodsTotal(context.items)
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
