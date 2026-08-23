import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http"

import {
  AdminGetCommerceSettingsParams,
  AdminUpdateCommerceSetting,
  AdminUpsertCommerceSetting,
} from "./admin/commerce-settings/validators"
import {
  AdminGetShippingAttributesParams,
  AdminShippingAttributeFlags,
  AdminUpsertShippingAttribute,
} from "./admin/shipping-attributes/validators"
import {
  StoreGetPaymentOptionsParams,
  StorePostPaymentOptions,
} from "./store/payment-options/validators"

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
    {
      matcher: "/admin/commerce-settings",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(AdminGetCommerceSettingsParams, {}),
      ],
    },
    {
      matcher: "/admin/commerce-settings",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminUpsertCommerceSetting)],
    },
    {
      matcher: "/admin/commerce-settings/:key",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminUpdateCommerceSetting)],
    },
    {
      matcher: "/store/payment-options",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(StoreGetPaymentOptionsParams, {}),
      ],
    },
    {
      matcher: "/store/payment-options",
      method: "POST",
      middlewares: [validateAndTransformBody(StorePostPaymentOptions)],
    },
  ],
})
