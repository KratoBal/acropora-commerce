import { z } from "@medusajs/framework/zod"

import { ORDER_LOCALES } from "../../../workflows/utils/order-locale"

/** The language of the page the payment started on; nothing else is accepted (`strict`). */
export const StorePostCartLocale = z.object({ locale: z.enum(ORDER_LOCALES) }).strict()

export type StorePostCartLocaleType = z.infer<typeof StorePostCartLocale>
