import Image from "next/image"

/**
 * A STRIPE HIVATALOS SZOVEGJELE (Balazs, 2026-10-05: a bankkartyas valaszto
 * jobb oldalan, bizalomepito elemkent; "ne rajzold ujra, ne irj ki lila
 * szoveget").
 *
 * A fajl a Stripe sajat logokeszletebol van, valtozatlanul:
 * stripe.com/newsroom/brand-assets -> Stripe_logo_kit.zip ->
 * `asset-wordmark/Stripe wordmark - Blurple.svg` (letoltve 2026-10-05). A
 * keret (viewBox 360x150) a logo sajat vedozonajat is tartalmazza, ezert a
 * meret ehhez aranyos.
 */
export const STRIPE_LOGO_UT = "/images/stripe-wordmark-blurple.svg"

export default function StripeLogo({ className }: { className?: string }) {
  return (
    <Image
      src={STRIPE_LOGO_UT}
      alt="Stripe"
      width={72}
      height={30}
      className={className}
      data-testid="stripe-logo"
    />
  )
}
