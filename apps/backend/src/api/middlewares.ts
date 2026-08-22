import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"

import {
  AdminGetShippingAttributesParams,
  AdminShippingAttributeFlags,
  AdminUpsertShippingAttribute,
} from "./admin/shipping-attributes/validators"

export default defineMiddlewares({
  routes: [
    {
      matcher: "/admin/shipping-attributes",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(AdminGetShippingAttributesParams, {}),
      ],
    },
    {
      matcher: "/admin/shipping-attributes",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminUpsertShippingAttribute)],
    },
    {
      matcher: "/admin/shipping-attributes/:id",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminShippingAttributeFlags)],
    },
  ],
})
