import LocalizedClientLink from "@modules/common/components/localized-client-link"

import {
  CART_LINE_LABEL,
  NOT_INCREMENTABLE,
  SIMILAR_PIECES_LABEL,
  UNIQUE_IN_CART_PROMISE,
  type CartLineState,
} from "./line-state"

/**
 * AMIT A KOSÁRSOR MOND AZ EGYEDI PÉLDÁNYRÓL (Balázs terve, 2026-09-07).
 *
 * TISZTA MEGJELENÍTÉS: az állapotot a hívó dönti el (`cartLineStateOf`), itt
 * csak a kirajzolás áll. Így a mobil és az asztali sor UGYANAZT az állapotot
 * kapja, nem külön számolja -- két számítás külön romolhatna el, és a lapon két
 * helyen két különböző válasz állna.
 */
export default function CartLineState({
  state,
  similarHref,
}: {
  state: CartLineState
  /** Hová visz az „Elkelt" sor továbbvivő hivatkozása. */
  similarHref: string
}) {
  if (state === "NORMAL") return null

  if (state === "ELKELT") {
    return (
      <div className="mt-1 flex flex-col gap-1" data-testid="cart-line-elkelt">
        <span
          className="w-fit px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
          style={{
            background: "var(--terv-hatter-sotet)",
            color: "var(--terv-szoveg-vilagos)",
          }}
        >
          {CART_LINE_LABEL.ELKELT}
        </span>
        <LocalizedClientLink
          href={similarHref}
          className="w-fit text-xs underline"
          style={{ color: "var(--terv-kiemel-tinta)" }}
        >
          {SIMILAR_PIECES_LABEL}
        </LocalizedClientLink>
      </div>
    )
  }

  return (
    <div className="mt-1 flex flex-col gap-1" data-testid="cart-line-egyedi">
      <span
        className="w-fit px-2 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide"
        style={{
          background: "var(--terv-kiemel)",
          color: "var(--terv-szoveg-vilagos)",
        }}
      >
        {CART_LINE_LABEL.EGYEDI}
      </span>
      {/*
       * A BETUJE NYITOTT KERDES, ES A TERV NEM DONTI EL (merve 2026-09-08).
       *
       * Ugyanez a mondat a kosar tervlapjan KETSZER all, UGYANAZON a lapon,
       * ket kulonbozo betuvel es egymas kozeleben:
       *
       *   y=833  x=174  12px/400  Space Grotesk
       *   y=926  x=630  16px/400  Newsreader
       *
       * Mind a ketto korul kosarsor-elemek allnak (mennyiseg-lepteto, ar,
       * "Nem novelheto"), tehat nem ket reszponziv valtozat, hanem KET KEZELES
       * ugyanarra az elemre. A tervbol tehat nem VEZETHETO LE, melyik a mienk.
       *
       * A #174 a Newsreadert valasztotta, es a #184 visszavonta -- nem azert,
       * mert a masik biztosan helyes, hanem mert a valasztas DONTES, es nem a
       * kirakat talalja ki. A mai alak a #174 ELOTTI allapot.
       *
       * AMI A KET IRANYBA HUZ, ES ELLENTMOND EGYMASNAK:
       *   a MERETUNK (11px) a 12px-es Space Grotesk alakhoz all kozelebb
       *   a HELYUNK viszont a szeles fo oszlop (a kosar racsa 856fr_452fr,
       *     es a tetelek a 856-osban allnak), ami a masik kezeleshez huz
       *
       * Ezert nem dontottem el magam. (nautilus merese, msg 14993; a masodik
       * elofordulast en mertem hozza, es a sajat elozo, meret-alapu ervemet
       * ezzel gyengitem.)
       */}
      <span
        className="text-[11px] leading-relaxed"
        style={{
          color: "var(--terv-szoveg-halvany)",
        }}
      >
        {UNIQUE_IN_CART_PROMISE}
      </span>
    </div>
  )
}

/**
 * A MENNYISÉG HELYÉN ÁLLÓ SZÖVEG EGYEDI PÉLDÁNYNÁL.
 *
 * Külön elem, mert MÁS HELYRE kerül: a jelvény a termék neve alá, ez a
 * léptető helyére. Egy komponensbe téve az egyik a másik oszlopában állna.
 */
export function NotIncrementable() {
  return (
    <span
      className="text-[11px]"
      style={{ color: "var(--terv-szoveg-halvany)" }}
      data-testid="cart-line-nem-novelheto"
    >
      {NOT_INCREMENTABLE}
    </span>
  )
}
