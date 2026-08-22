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
  CommerceSettingsContainer,
  getShippingPricingSettings,
} from "../commerce-settings/accessor"
import { calculateGoodsTotal } from "../../workflows/utils/goods-total"
import { ShippingOptionRole } from "../../workflows/utils/shipping-eligibility"
import {
  buildShippingOptionRoleMap,
  resolveShippingOptionRoleBindings,
} from "../../workflows/utils/shipping-option-roles"
import { calculateShippingPrice } from "../../workflows/utils/shipping-pricing"

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

/**
 * Calculated-price provider for Acropora's existing manually executed shipping
 * methods. Carrier booking and label handling deliberately remain no-ops.
 */
class AcroporaFulfillmentService extends AbstractFulfillmentProviderService {
  static identifier = "acropora"

  protected readonly container_: CommerceSettingsContainer

  constructor(container: CommerceSettingsContainer) {
    super()
    this.container_ = container
  }

  async getFulfillmentOptions(): Promise<FulfillmentOption[]> {
    return resolveShippingOptionRoleBindings().map(({ id, name }) => ({
      id,
      name,
    }))
  }

  async validateFulfillmentData(
    optionData: Record<string, unknown>,
    data: Record<string, unknown>,
    _context: ValidateFulfillmentDataContext,
  ): Promise<Record<string, unknown>> {
    optionRole(optionData)
    return data
  }

  async validateOption(data: Record<string, unknown>): Promise<boolean> {
    return isKnownOption(data)
  }

  async canCalculate(data: CreateShippingOptionDTO): Promise<boolean> {
    return data.price_type === "calculated" && isKnownOption(data.data)
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
    const settings = await getShippingPricingSettings(this.container_)
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
