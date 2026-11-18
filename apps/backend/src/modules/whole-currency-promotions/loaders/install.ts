import type { LoaderOptions } from "@medusajs/framework/types"

import { installWholeCurrencyRounding } from "../rounding"

/**
 * The promotion service class Medusa itself loads: resolved from `@medusajs/medusa`'s own place, so the wrap lands on
 * the same file (the backend does not depend on `@medusajs/promotion` directly).
 *
 * WHY NOT A REPLACED MODULE OR A PATCH: a module of our own in the promotion's place would read the promotion's
 * migrations from our folder (`load-internal.js`: `<module path>/migrations`), so a Medusa upgrade's promotion migrations
 * would be skipped; and a package patch would not reach the image, whose runner installs `.medusa/server` with npm.
 */
export function medusaPromotionService() {
  const medusa = require.resolve("@medusajs/medusa/package.json")
  return require(require.resolve("@medusajs/promotion", { paths: [medusa] })).default.service
}

export default async ({ logger }: LoaderOptions) => {
  const log = logger ?? console
  const installed = installWholeCurrencyRounding(medusaPromotionService())
  log.info(
    installed
      ? "[whole-currency-promotions] promotion adjustments are rounded to whole currency units"
      : "[whole-currency-promotions] the rounding was already installed"
  )
}
