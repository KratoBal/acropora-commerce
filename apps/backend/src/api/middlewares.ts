import {
  authenticate,
  defineMiddlewares,
  validateAndTransformBody,
  validateAndTransformQuery,
} from "@medusajs/framework/http";

import { AdminPostPickupSkip } from "./admin/order-attention/pickup-skip/validators";
import {
  refuseCustomerAszfRecord,
  refuseCustomerMetadataUpdate,
} from "./refuse-client-customer-metadata";
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
  AdminPutBrand,
  AdminPutProductBrand,
} from "./admin/brands/validators";
import { AdminPutUrlRedirects } from "./admin/url-redirects/validators";
import { AdminPutLandingPage } from "./admin/landing-pages/validators";
import { AdminPutHomepageContent } from "./admin/homepage-content/validators";
import {
  AdminResendOrderStatusNotification,
  AdminTransitionOrderBusinessStatus,
} from "./admin/order-business-status/validators";
import { AdminOrderShippingNotice } from "./admin/order-shipping-notice/validators";
import { AdminPostOrderSplit } from "./admin/order-split/validators";
import { StorePostCartNotes } from "./store/cart-notes/validators";
import { StorePostNewsletterSubscription } from "./store/newsletter-subscriptions/validators";
import { AdminPostOrderNotes } from "./admin/order-notes/validators";
import {
  AdminGetOrderPickupPointsParams,
  AdminPostOrderPickupPoint,
  AdminPostOrderShippingMethod,
} from "./admin/order-shipping/validators";
import { AdminGetWebshopMailOutboxParams } from "./admin/webshop-mail/outbox/validators";
import {
  AdminRecordTransferReceipt,
  AdminReleaseOrderPaymentHold,
  AdminSendOrderPaymentLink,
} from "./admin/order-payment/validators";
import { StoreOrderPaymentEmptyBody } from "./store/order-payment/validators";
import { StoreChangePassword } from "./store/customers/me/password/validators";
import { StoreGetFoxpostPickupPointsParams } from "./store/foxpost/pickup-points/validators";
import { StoreGetGlsPickupPointsParams } from "./store/gls/pickup-points/validators";
import { refuseClientSessionData } from "./refuse-client-session-data";
import { refuseClientCartMetadata } from "./refuse-client-cart-metadata";
import { guardOrderRead } from "./order-read-guard";
import { promotionAttempts, signInAttempts, signUpAttempts } from "./attempt-limits";
import { requireLongPassword } from "./password-rules";
import { StorePostAszfElfogadas } from "./store/carts/[id]/aszf-elfogadas/validators";
import { refuseShippingDiscount } from "./refuse-shipping-discount";
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
      matcher: "/admin/brands/:os_brand_id",
      method: "PUT",
      middlewares: [validateAndTransformBody(AdminPutBrand)],
    },
    {
      matcher: "/admin/product-brands/:product_id",
      method: "PUT",
      middlewares: [validateAndTransformBody(AdminPutProductBrand)],
    },
    {
      matcher: "/admin/landing-pages/:os_landing_id",
      method: "PUT",
      middlewares: [validateAndTransformBody(AdminPutLandingPage)],
    },
    {
      matcher: "/admin/homepage-content",
      method: "PUT",
      middlewares: [validateAndTransformBody(AdminPutHomepageContent)],
    },
    {
      matcher: "/admin/product-knowledge/:product_id",
      method: "PUT",
      middlewares: [validateAndTransformBody(AdminPutProductKnowledge)],
    },
    {
      // the whole list in one body (stage: 1901 rows, about 300 kB); the
      // default JSON limit is 100 kB
      matcher: "/admin/url-redirects",
      method: "PUT",
      bodyParser: { sizeLimit: "5mb" },
      middlewares: [validateAndTransformBody(AdminPutUrlRedirects)],
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
      // Medusa's order read has no authentication: only the order's customer, or the
      // storefront's view signature for this order, reads it (audit A6b, order-read-guard.ts).
      matcher: "/store/orders/:id",
      method: "GET",
      middlewares: [
        authenticate("customer", ["session", "bearer"], { allowUnauthenticated: true }),
        guardOrderRead,
      ],
    },
    {
      // "Do not retry this pickup order" (audit P1/6; pickup-retry-skip.ts).
      matcher: "/admin/order-attention/pickup-skip",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminPostPickupSkip)],
    },
    {
      // The ÁSZF record is the server's (aszf-record.ts); the stock cart and line writes
      // carry no metadata from the client (audit A4).
      matcher: "/store/carts/:id/aszf-elfogadas",
      method: "POST",
      middlewares: [validateAndTransformBody(StorePostAszfElfogadas)],
    },
    {
      // The registration's ÁSZF record is the server's (customer-aszf-record.ts; audit A4, customer twin).
      matcher: "/store/customers/me/aszf-elfogadas",
      method: "POST",
      middlewares: [validateAndTransformBody(StorePostAszfElfogadas)],
    },
    {
      matcher: "/store/customers",
      method: "POST",
      middlewares: [refuseCustomerAszfRecord],
    },
    {
      matcher: "/store/customers/me",
      method: "POST",
      middlewares: [refuseCustomerMetadataUpdate],
    },
    ...[
      "/store/carts",
      "/store/carts/:id",
      "/store/carts/:id/line-items",
      "/store/carts/:id/line-items/:line_id",
    ].map((matcher) => ({
      matcher,
      method: "POST" as const,
      middlewares: [refuseClientCartMetadata],
    })),
    {
      // Attempt limits and the password length (audit P1/8; attempt-limits.ts,
      // password-rules.ts). The sign-in is the stock route; the limit counts per address.
      matcher: "/auth/customer/emailpass",
      method: "POST",
      middlewares: [signInAttempts],
    },
    {
      matcher: "/auth/customer/emailpass/register",
      method: "POST",
      middlewares: [signUpAttempts, requireLongPassword],
    },
    {
      matcher: "/auth/customer/emailpass/update",
      method: "POST",
      middlewares: [requireLongPassword],
    },
    {
      matcher: "/store/carts/:id/promotions",
      method: "POST",
      middlewares: [promotionAttempts],
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
      // "Megjött az előre utalás" (bb3a6bd5): the bank-transfer session captured.
      matcher: "/admin/order-payment/:order_id/transfer-receipt",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminRecordTransferReceipt)],
    },
    {
      // "Csúszik a szállítás": the card hold released, the order waiting for payment.
      matcher: "/admin/order-payment/:order_id/release-hold",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminReleaseOrderPaymentHold)],
    },
    {
      // "Fizetési link küldése": the link for what the order owes now.
      matcher: "/admin/order-payment/:order_id/payment-link",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminSendOrderPaymentLink)],
    },
    {
      // The payment page's Stripe session; the token in the path is all it takes.
      matcher: "/store/order-payment/:token/session",
      method: "POST",
      middlewares: [validateAndTransformBody(StoreOrderPaymentEmptyBody)],
    },
    {
      matcher: "/store/order-payment/:token/complete",
      method: "POST",
      middlewares: [validateAndTransformBody(StoreOrderPaymentEmptyBody)],
    },
    {
      // the checkout's two notes (card d3b54954)
      matcher: "/store/cart-notes/:cart_id",
      method: "POST",
      middlewares: [validateAndTransformBody(StorePostCartNotes)],
    },
    {
      matcher: "/store/newsletter-subscriptions",
      method: "POST",
      middlewares: [validateAndTransformBody(StorePostNewsletterSubscription)],
    },
    {
      // the order page's two note pencils (card d3b54954)
      matcher: "/admin/order-notes/:order_id",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminPostOrderNotes)],
    },
    {
      // a placed order's pickup point, changed from the OS (card d3b54954, S1)
      matcher: "/admin/order-shipping/:order_id/points",
      method: "GET",
      middlewares: [validateAndTransformQuery(AdminGetOrderPickupPointsParams, {})],
    },
    {
      matcher: "/admin/order-shipping/:order_id/point",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminPostOrderPickupPoint)],
    },
    {
      // the shop's mails that did not go (Levélsablonok)
      matcher: "/admin/webshop-mail/outbox",
      method: "GET",
      middlewares: [validateAndTransformQuery(AdminGetWebshopMailOutboxParams, {})],
    },
    {
      // a placed order split into two linked orders (card 0a14f739, C/3)
      matcher: "/admin/order-split/:order_id",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminPostOrderSplit)],
    },
    {
      // a placed order's shipping method changed from the OS (card 0a14f739, C/2)
      matcher: "/admin/order-shipping/:order_id/method",
      method: "POST",
      middlewares: [validateAndTransformBody(AdminPostOrderShippingMethod)],
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
      // 790da0cd: a discount comes off the products only, never the shipping
      matcher: "/admin/promotions",
      method: "POST",
      middlewares: [refuseShippingDiscount],
    },
    {
      matcher: "/admin/promotions/:id",
      method: "POST",
      middlewares: [refuseShippingDiscount],
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
