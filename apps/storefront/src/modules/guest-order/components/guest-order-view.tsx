"use client"

import { translator } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import {
  carrierName,
  isSplitPurchase,
  orderedForPage,
  paymentTextKeys,
  safeTrackingUrl,
  statusTextKeys,
  type GuestOrder,
} from "@lib/util/guest-order"
import { convertToLocale } from "@lib/util/money"
import { Button } from "@modules/common/components/ui"
import { useState } from "react"

import ProblemReportForm from "./problem-report-form"

/**
 * THE GUEST ORDER PAGE'S ANSWER (V1.1): one block per order, a mixed cart's two orders under one
 * notice. PURE DISPLAY: it gets the orders the backend named and draws them; the decisions
 * (which block, which text, whether a link may stand) are in `@lib/util/guest-order`.
 *
 * NOTHING HERE IS BUILT BY THE SHOP: the tracking button is the link the carrier gave, and without
 * one the page says so and shows the number only.
 */
export default function GuestOrderView({
  orders,
  email,
}: {
  orders: GuestOrder[]
  /**
   * The address the customer opened the orders with. With it, each order offers the problem report
   * ("Probléma a szállítmánnyal", V1.2); without it (a display with no way to file) the button is not drawn.
   */
  email?: string
}) {
  const locale = useLocale()
  const t = translator(locale)
  const ordered = orderedForPage(orders)
  const split = isSplitPurchase(ordered)
  return (
    <div className="flex flex-col gap-y-8" data-testid="guest-order-view">
      {split && (
        <p
          className="border border-acr-heritage px-4 py-3 text-[14px] text-acr-ink"
          data-testid="guest-order-split"
        >
          {t("guestOrder.splitNotice")}
        </p>
      )}
      {ordered.map((order) => (
        <OrderBlock
          key={String(order.display_id)}
          order={order}
          email={email}
          heading={
            split
              ? order.shipping?.store_pickup
                ? t("guestOrder.blockPickup")
                : t("guestOrder.blockShipped")
              : null
          }
        />
      ))}
    </div>
  )
}

function OrderBlock({
  order,
  heading,
  email,
}: {
  order: GuestOrder
  heading: string | null
  email?: string
}) {
  const locale = useLocale()
  const t = translator(locale)
  const [reporting, setReporting] = useState(false)
  const money = (amount: number) =>
    convertToLocale({ amount, currency_code: order.currency_code })
  const status = order.business_status
    ? statusTextKeys(order.business_status.status)
    : null
  const payment = paymentTextKeys(order.payment_status)
  const placed = order.created_at
    ? new Intl.DateTimeFormat(locale === "hu" ? "hu-HU" : "en-GB", {
        timeZone: "Europe/Budapest",
        year: "numeric",
        month: locale === "hu" ? "numeric" : "short",
        day: "numeric",
      }).format(new Date(order.created_at))
    : null
  const point = order.shipping?.pickup_point
  const tracking = order.tracking
  const trackingUrl = tracking ? safeTrackingUrl(tracking.url) : null
  return (
    <section
      className="flex flex-col gap-y-4"
      data-testid={`guest-order-${order.display_id}`}
    >
      <header className="flex flex-col gap-y-1">
        {heading && (
          <p className="text-[11px] font-bold tracking-[0.08em] text-acr-heritage">
            {heading}
          </p>
        )}
        <h2 className="text-[20px] font-semibold text-acr-ink">
          {t("guestOrder.orderNumber", { number: order.display_id })}
        </h2>
        {placed && (
          <p className="text-[13px] text-acr-slate">
            {t("guestOrder.placedOn", { date: placed })}
          </p>
        )}
      </header>

      <div className="flex flex-col gap-y-1" data-testid="guest-order-status">
        <p className="text-[11px] font-bold tracking-[0.08em] text-acr-slate">
          {t("guestOrder.statusHeading")}
        </p>
        {order.business_status && (
          <>
            <p className="text-[16px] font-semibold text-acr-ink">
              {status ? t(status.label) : order.business_status.label}
            </p>
            {status && (
              <p className="text-[14px] text-acr-ink">{t(status.text)}</p>
            )}
          </>
        )}
      </div>

      {payment && (
        <div
          className="flex flex-col gap-y-1"
          data-testid="guest-order-payment"
        >
          <p className="text-[11px] font-bold tracking-[0.08em] text-acr-slate">
            {t("guestOrder.paymentHeading")}
          </p>
          <p className="text-[16px] font-semibold text-acr-ink">
            {t(payment.label)}
          </p>
          <p className="text-[14px] text-acr-ink">{t(payment.text)}</p>
        </div>
      )}

      <div className="flex flex-col gap-y-1" data-testid="guest-order-tracking">
        {order.shipping && !order.shipping.store_pickup && (
          <>
            {tracking && (
              <p className="text-[14px] text-acr-ink">
                {t("guestOrder.carrierLine", {
                  carrier: carrierName(tracking.carrier),
                })}
              </p>
            )}
            {point && (
              <p className="text-[14px] text-acr-ink">
                {point.address
                  ? t("guestOrder.pickupPoint", {
                      name: point.name,
                      address: point.address,
                    })
                  : t("guestOrder.pickupPointNameOnly", { name: point.name })}
              </p>
            )}
            {tracking ? (
              <>
                <p className="text-[14px] text-acr-ink">
                  {t("guestOrder.trackingNumber", { number: tracking.number })}
                </p>
                {trackingUrl ? (
                  <a
                    href={trackingUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-1 inline-block w-fit border border-acr-ink px-4 py-2 text-[14px] font-semibold text-acr-ink"
                    data-testid="guest-order-tracking-link"
                  >
                    {t("guestOrder.trackingButton")}
                  </a>
                ) : (
                  <p className="text-[13px] text-acr-slate">
                    {t("guestOrder.trackingNoLink")}
                  </p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-acr-slate">
                {t("guestOrder.trackingNone")}
              </p>
            )}
          </>
        )}
      </div>

      <ul className="flex flex-col gap-y-1 text-[14px] text-acr-ink">
        <li className="text-[11px] font-bold tracking-[0.08em] text-acr-slate">
          {t("guestOrder.itemsHeading")}
        </li>
        {order.items.map((item, index) => (
          <li key={index} className="flex justify-between gap-x-4">
            <span>
              {item.title} × {item.quantity}
            </span>
            <span className="whitespace-nowrap">{money(item.total)}</span>
          </li>
        ))}
        {order.shipping && (
          <li className="flex justify-between gap-x-4 text-acr-slate">
            <span>
              {t("guestOrder.shippingLine", {
                name: order.shipping.method_name,
              })}
            </span>
          </li>
        )}
        <li className="flex justify-between gap-x-4 border-t border-acr-slate/30 pt-1 font-semibold">
          <span>{t("guestOrder.totalLine")}</span>
          <span className="whitespace-nowrap" data-testid="guest-order-total">
            {money(order.total)}
          </span>
        </li>
      </ul>

      {email && order.items.length > 0 && (
        <div className="flex flex-col gap-y-3">
          {!reporting && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => setReporting(true)}
              data-testid={`problem-open-${order.display_id}`}
            >
              {t("guestOrder.problem.openButton")}
            </Button>
          )}
          {reporting && (
            <ProblemReportForm
              order={order}
              email={email}
              onClose={() => setReporting(false)}
            />
          )}
        </div>
      )}
    </section>
  )
}
