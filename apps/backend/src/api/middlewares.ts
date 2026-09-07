import {
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";

import {
  AdminGetCommerceSettingsParams,
  AdminUpdateCommerceSetting,
  AdminUpsertCommerceSetting,
} from "./admin/commerce-settings/validators";
import {
  AdminGetShippingAttributesParams,
  AdminShippingAttributeFlags,
  AdminUpsertShippingAttribute,
} from "./admin/shipping-attributes/validators";
import {
  StoreGetPaymentOptionsParams,
  StorePostPaymentOptions,
} from "./store/payment-options/validators";
import { StoreGetShippingClassParams } from "./store/shipping-class/validators";
import { AdminTransitionOrderBusinessStatus } from "./admin/order-business-status/validators";

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
      matcher: "/admin/order-business-status/:order_id",
      method: "POST",
      middlewares: [
        validateAndTransformBody(AdminTransitionOrderBusinessStatus),
      ],
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
    {
      matcher: "/store/shipping-class",
      method: "GET",
      middlewares: [validateAndTransformQuery(StoreGetShippingClassParams, {})],
    },
  ],
});
