import { MedusaError } from "@medusajs/framework/utils";

import {
  COMMERCE_SETTING_DEFINITIONS,
  CommerceSettingKey,
  FREE_SHIPPING_THRESHOLD_SETTING_KEY,
  SHIPPING_FOXPOST_SETTING_KEY,
  SHIPPING_GLS_HEAVY_SETTING_KEY,
  SHIPPING_GLS_NORMAL_SETTING_KEY,
} from "./definitions";

type CommerceSettingRow = {
  key: string;
  value: unknown;
};

export type CommerceSettingsService = {
  listCommerceSettings: (
    filters: { key: string },
    config: { take: number },
  ) => Promise<CommerceSettingRow[]>;
};

/**
 * Reads and validates one setting. Missing rows use an approved default only;
 * carrier prices intentionally fail until the business configures them.
 */
export const getCommerceSettingValue = async (
  service: CommerceSettingsService,
  key: CommerceSettingKey,
): Promise<number> => {
  const [setting] = await service.listCommerceSettings({ key }, { take: 1 });
  const definition = COMMERCE_SETTING_DEFINITIONS[key];

  if (setting) {
    return definition.normalize(setting.value);
  }

  if (definition.defaultValue !== undefined) {
    return definition.defaultValue;
  }

  throw new MedusaError(
    MedusaError.Types.INVALID_DATA,
    `${key} must be configured before shipping pricing can run`,
  );
};

export type ShippingPricingSettings = {
  shipping_gls_normal_huf: number;
  shipping_gls_heavy_huf: number;
  shipping_foxpost_huf: number;
  free_shipping_threshold_huf: number;
};

/** Reads all values required by the future calculated-price provider. */
export const getShippingPricingSettings = async (
  service: CommerceSettingsService,
): Promise<ShippingPricingSettings> => {
  const [glsNormal, glsHeavy, foxpost, freeShippingThreshold] =
    await Promise.all([
      getCommerceSettingValue(service, SHIPPING_GLS_NORMAL_SETTING_KEY),
      getCommerceSettingValue(service, SHIPPING_GLS_HEAVY_SETTING_KEY),
      getCommerceSettingValue(service, SHIPPING_FOXPOST_SETTING_KEY),
      getCommerceSettingValue(service, FREE_SHIPPING_THRESHOLD_SETTING_KEY),
    ]);

  return {
    shipping_gls_normal_huf: glsNormal,
    shipping_gls_heavy_huf: glsHeavy,
    shipping_foxpost_huf: foxpost,
    free_shipping_threshold_huf: freeShippingThreshold,
  };
};
