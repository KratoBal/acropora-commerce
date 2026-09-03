import { Module } from "@medusajs/framework/utils"

import CommerceSettingsModuleService from "./service"

export const COMMERCE_SETTINGS_MODULE = "commerce_settings"

/**
 * A LOADER INNEN ELKERULT, ES A HELYE VOLT A HIBA, NEM A TARTALMA.
 *
 * Itt allt a hat szallitasi-mod azonosito indulasi ellenorzese, azzal az
 * indoklassal, hogy az azonositok BEALLITASOK, es ez a beallitasok modulja. Az
 * indoklas jo volt, a hely nem: a `runLoaders` a modul SAJAT konteneret adja at
 * a betoltonek, a `query` viszont az ALKALMAZAS konteneteren all, es csak akkor,
 * amikor mar minden modul betoltodott.
 *
 * Ezert az ellenorzes SOHA nem futott le, egyetlen kornyezetben sem, es minden
 * indulaskor kiirta, hogy nem tudta elvegezni. Nem hiba jele volt, hanem az
 * egyetlen lehetseges viselkedes.
 *
 * Az ellenorzes most `src/scripts/verify-shipping-option-roles.ts` alatt all, es
 * az indito szkript futtatja a szerver elindulasa ELOTT, ott, ahol a `query`
 * letezik. A tartalma valtozatlan.
 */
export default Module(COMMERCE_SETTINGS_MODULE, {
  service: CommerceSettingsModuleService,
})
