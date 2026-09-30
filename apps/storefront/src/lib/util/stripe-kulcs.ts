/**
 * A STRIPE PUBLIKUS KULCSA A KIRAKATBAN, EGY HELYEN.
 *
 * A kartyamezo (`payment-wrapper`) ezzel tolti be a Stripe.js-t, es a fizetesi
 * lepes ebbol tudja, hogy a Stripe egyaltalan megjelenitheto-e. Ha a hatter
 * mar felkinalja a Stripe-ot, de itt nincs kulcs, a vevo egy orokke tolto
 * kartyamezot latna: ilyenkor a mod NEM jelenik meg (Stripe a SimplePay
 * mellett, Balazs 2026-09-30, csak a teszt kirakaton).
 *
 * A `NEXT_PUBLIC_*` erteket a Next a buildkor egeti be, tehat ez a kliensen is
 * ugyanaz az ertek, mint a szerveren.
 */
export const STRIPE_PUBLIKUS_KULCS =
  process.env.NEXT_PUBLIC_STRIPE_KEY ||
  process.env.NEXT_PUBLIC_MEDUSA_PAYMENTS_PUBLISHABLE_KEY ||
  ""
