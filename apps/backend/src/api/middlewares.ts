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
import { AdminPutProductKnowledge } from "./admin/product-knowledge/validators";
import { AdminTransitionOrderBusinessStatus } from "./admin/order-business-status/validators";
import { StoreChangePassword } from "./store/customers/me/password/validators";
import { StoreGetFoxpostPickupPointsParams } from "./store/foxpost/pickup-points/validators";
import { StoreGetGlsPickupPointsParams } from "./store/gls/pickup-points/validators";
import { refuseClientSimplePayKeys } from "./refuse-client-simplepay-keys";
import { captureBeforeOrderEditConfirm } from "./capture-before-order-edit-confirm";
import { refundBeforeOrderCancel } from "./refund-before-order-cancel";

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
      matcher: "/admin/product-knowledge/:product_id",
      method: "PUT",
      middlewares: [validateAndTransformBody(AdminPutProductKnowledge)],
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
      // Medusa's cancel swallows a failed refund; the captured money is refunded first,
      // loudly, and a mixed cart's shipped order waits for its pickup order.
      matcher: "/admin/orders/:id/cancel",
      method: "POST",
      middlewares: [refundBeforeOrderCancel],
    },
    {
      // Medusa's confirm cancels an uncaptured card hold; the hold is captured first.
      // Runs after the admin authentication (the loader applies it to /admin first).
      matcher: "/admin/order-edits/:id/confirm",
      method: "POST",
      middlewares: [captureBeforeOrderEditConfirm],
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
      matcher: "/store/customers/me/password",
      method: "POST",
      middlewares: [validateAndTransformBody(StoreChangePassword)],
    },
    {
      matcher: "/store/foxpost/pickup-points",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(StoreGetFoxpostPickupPointsParams, {}),
      ],
    },
    {
      matcher: "/store/gls/pickup-points",
      method: "GET",
      middlewares: [
        validateAndTransformQuery(StoreGetGlsPickupPointsParams, {}),
      ],
    },
    {
      matcher: "/store/payment-collections/:id/payment-sessions",
      method: "POST",
      middlewares: [refuseClientSimplePayKeys],
    },
    {
      // SimplePay signs the exact bytes it sends; the IPN is checked on them.
      matcher: "/simplepay/ipn",
      method: "POST",
      bodyParser: { preserveRawBody: true },
    },
    {
      matcher: "/store/shipping-class",
      method: "GET",
      middlewares: [validateAndTransformQuery(StoreGetShippingClassParams, {})],
    },
  ],
});
