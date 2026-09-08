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
        {/*
          EZ A CSIP SZANDEKOSAN VALTOZATLAN, ES A MERES MONDJA MEG, MIERT.

          Az ELKELT csipnek NINCS asztali tervbeli parja. A kosar-tervben az
          asztali keret (1440 px) EGYETLEN csipet tartalmaz, az egyedi-peldany
          csipet; az "ELKELT" nagybetuvel NULLASZOR fordul elo benne. Az egyetlen
          kisbetus talalat egy szakasz-felirat ("Három állapot -- üres kosár,
          elfogyott műszaki tétel, elkelt példány"), vagyis a dokumentum sajat
          annotacioja, nem kosar-tartalom.

          A harom allapotot a terv csak MOBIL szelessegen (390 px) rajzolja meg,
          es ott a csip igy all: padding 6px 10px, background oklch(0.35 0.018 250),
          color oklch(0.95 0.006 250), JetBrains Mono 10px/500, betukoz 0.12em.

          AZT NEM VESSZUK AT, mert az MASIK KERETBOL valo -- es epp az a keveres,
          amit a kikotes kizar. A tinta egyebkent MAR EGYEZIK: a mi
          `--terv-szoveg-vilagos` tokenunk betuere az az ertek.

          AMI EBBOL KOVETKEZIK, ES NEM ELHALLGATVA: amig ez igy all, a ket csip
          KULONBOZO BETUT visel egy kosarban -- az egyedi mono, ez a torzs-betu.
          Egyszerre ritkan latszik (ahhoz egy egyedi es egy elkelt sor kell
          ugyanabban a kosarban), de latszhat. Ket feloldas van, es egyik sem az
          enyem: vagy a mobil ertekek jonnek at tudatosan, vagy a terv kap egy
          asztali ELKELT csipet.
        */}
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
      {/*
        A CSIP TIPOGRAFIAJA EGYETLEN TERVELEMBOL JON (acrobot kikotese, 2026-09-08).

        Az ASZTALI kosar-kereten (1440 px) pontosan EGY csip all, es ez az:

            display:inline-flex; padding:9px 12px;
            background:oklch(0.55 0.13 45);      -> --terv-kiemel        (betuere)
            color:#fff;                          -> --terv-kiemel-szoveg (betuere)
            font-family:'JetBrains Mono';        -> --terv-betu-mono-lanc
            font-size:10.5px; font-weight:500; letter-spacing:0.12em

        A BETU ES A MERET UGYANABBOL A SORBOL VALO, nem kevertem a mai
        ertekunkkel. Ami valtozott a korabbihoz kepest: a betu (eddig a
        torzs-betu allt itt), a vastagsag (600 helyett 500), a betukoz
        (0.025em helyett 0.12em), a belso margo (8/2 helyett 9/12) es a tinta.

        A TINTA CSERELODOTT A LEGCSENDESEBBEN: eddig `--terv-szoveg-vilagos`
        allt itt (oklch(0.95 0.006 250)), a terv viszont TISZTA FEHERET ker,
        ami a `--terv-kiemel-szoveg` -- es az a token neve szerint is ez:
        a rez feluleten allo tinta. A ketto kozott alig van kulonbseg, es
        pontosan ezert nem tunt volna fel senkinek.
      */}
      <span
        className="w-fit px-3 py-[9px] text-[10.5px] font-medium uppercase"
        style={{
          background: "var(--terv-kiemel)",
          color: "var(--terv-kiemel-szoveg)",
          fontFamily: "var(--terv-betu-mono-lanc)",
          letterSpacing: "0.12em",
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
       *
       * === A PREMISSZA MEGDOLT (murena merese, 2026-09-08) ===
       *
       * A fenti ervelés abbol indult ki, hogy a ket elofordulas "nem ket
       * reszponziv valtozat, hanem KET KEZELES ugyanarra az elemre". Ez
       * TEVES, es a tervlap sajat szerkezete mondja meg:
       *
       *   a 3a lap PONTOSAN ket nezet-keretet tartalmaz,
       *     width:390px  (mobil)   es  width:1440px (asztali)
       *   a mondat ket elofordulasa:
       *     a 390-esen BELUL  -> orokolt betu, 12px
       *     az 1440-esen BELUL -> Newsreader, 15.5px
       *
       * Kosarsor-elemek azert allnak mind a ketto korul, mert a MOBIL nezetben
       * IS vannak kosarsorok. Ugyanez all egy MASODIK mondatra is, fuggetlenul:
       * az atveteli indoklas (`pickup-notice`) szinten orokolt a mobilon es
       * Newsreader az asztalin.
       *
       * KONTROLL, hogy ne a makett altalanos tulajdonsagat merjem: a terv
       * MASHOL nem valt betucsaladot a ket nezet kozott (az "ÉLŐ ÁLLAT A
       * KOSÁRBAN" cimke mind a kettoben JetBrains Mono, a tobbi vizsgalt
       * szoveg mind a kettoben orokolt -- csak a MERETUK valtozik).
       *
       * === AMI EZUTAN IS NYITOTT MARADT, ES EZERT CSAK A FELET KOTOM BE ===
       *
       * A 3b lapon a szerif a MOBIL kereten belul IS ott van. Tehat a "szerif
       * csak asztalin" NEM a terv szabalya, es ket olvasat all:
       *
       *   A) SZANDEKOS: a 3a keskeny hasabjaban a dolt szerif rosszul olvasna,
       *      ezert ott nincs. Akkor a torespont a helyes alak.
       *   B) ELAVULT: a 3a mobil kerete a legkorabbi a negy nezet kozul, es a
       *      szerif kesobb kerult a tervbe. Akkor a bekotes feltetel nelkuli.
       *
       * MIND A KET OLVASAT SZERINT az ASZTALI nezetben szerif all. Ezert a
       * `small:` toresponthoz kotom: (A) alatt pontos, (B) alatt hianyos, de
       * EGYIK alatt sem rossz. A mobil fele Balazs vagy picasso egy mondatara
       * var, es addig a mai allapotban marad.
       *
       * A `small:` a kosar racsanak sajat toresponja is (`templates/index.tsx`,
       * `small:grid-cols-[856fr_452fr]`), tehat ugyanott valt, ahol a lap
       * ketoszloposra all -- nem egy kulon, kitalalt hatar.
       */}
      <span
        className="text-[11px] leading-relaxed small:font-kiemelt"
        style={{
          color: "var(--terv-szoveg-halvany)",
        }}
        data-testid="egyedi-kosar-igeret"
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
