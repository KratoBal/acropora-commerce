import { Module } from "@medusajs/framework/utils"

import CommerceSettingsModuleService from "./service"
import verifyShippingOptionRolesLoader from "./loaders/verify-shipping-option-roles"

export const COMMERCE_SETTINGS_MODULE = "commerce_settings"

/**
 * A LOADER ITT LOG, ES EZ AZ ELSO LOADER EBBEN A REPOBAN.
 *
 * Miert EBBEN a modulban: a hat szallitasi-mod azonosito BEALLITAS, es ez a
 * beallitasok modulja. Egy sajat modul letrehozasa csak azert, hogy legyen hova
 * tenni egy indulasi ellenorzest, tobb szerkezetet adna, mint amennyi kerdest
 * megold.
 */
export default Module(COMMERCE_SETTINGS_MODULE, {
  service: CommerceSettingsModuleService,
  loaders: [verifyShippingOptionRolesLoader],
})
