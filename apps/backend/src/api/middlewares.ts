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
import {
  AdminResendOrderStatusNotification,
  AdminTransitionOrderBusinessStatus,
} from "./admin/order-business-status/validators";
import { AdminOrderShippingNotice } from "./admin/order-shipping-notice/validators";
import { StoreChangePassword } from "./store/customers/me/password/validators";
import { StoreGetFoxpostPickupPointsParams } from "./store/foxpost/pickup-points/validators";
import { StoreGetGlsPickupPointsParams } from "./store/gls/pickup-points/validators";
import { refuseClientSessionData } from "./refuse-client-session-data";
import { orderEditConfirmKeepsHold } from "./order-edit-confirm-keeps-hold";
import { refundBeforeOrderCancel } from "./refund-before-order-cancel";
import { captureOnlyOrderTotal } from "./capture-only-order-total";
import {
  aszfBeforeCardSession,
  aszfBeforeCardStart,
  aszfBeforePlaceOrder,
} from "./require-aszf-acceptance";

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
      // Medusa's confirm would cancel an uncaptured card hold; it runs with the hold kept.
      // Runs after the admin authentication (the loader applies it to /admin first).
      matcher: "/admin/order-edits/:id/confirm",
      method: "POST",
      middlewares: [orderEditConfirmKeepsHold],
    },
    {
      // No ÁSZF acceptance on the cart: no shared PaymentIntent (aszf-guard.ts).
      matcher: "/store/carts/:id/stripe-start",
      method: "POST",
      middlewares: [aszfBeforeCardStart],
    },
    {
      // No ÁSZF acceptance on the cart: no order, unless a card is already held.
      matcher: "/store/carts/:id/complete-split",
      method: "POST",
      middlewares: [aszfBeforePlaceOrder],
    },
    {
      // A card payment is captured for its order's current total; a smaller
      // amount only through an order edit (admin-capture-guard.ts).
      matcher: "/admin/payments/:id/capture",
      method: "POST",
      middlewares: [captureOnlyOrderTotal],
    },
    {
      // The OS's notice that a parcel exists: the "Feladtuk" mail (order-shipping-notice).
      matcher: "/admin/order-shipping-notice/:order_id",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminOrderShippingNotice)],
    },
    {
      matcher: "/admin/order-business-status/:order_id",
      method: "POST",
      middlewares: [
        validateAndTransformBody(AdminTransitionOrderBusinessStatus),
      ],
    },
    {
      // "Értesítő újraküldése": the mail of one status change again.
      matcher: "/admin/order-business-status/:order_id/resend-notification",
      method: "POST",
      middlewares: [
        validateAndTransformBody(AdminResendOrderStatusNotification),
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
      middlewares: [refuseClientSessionData, aszfBeforeCardSession],
    },
    {
      matcher: "/store/shipping-class",
      method: "GET",
      middlewares: [validateAndTransformQuery(StoreGetShippingClassParams, {})],
    },
  ],
});
