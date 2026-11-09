import { createStockAlertTokenPost } from "../helpers"

/** The leaving link's page posts its token here (V2.4); see `helpers.ts`. */
export const POST = createStockAlertTokenPost((service, token) => service.unsubscribeByToken(token))
