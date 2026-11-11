import { translator, type Translate } from "@lib/i18n/dictionary"
import { foxpostPontTipus } from "./csomagpont"
import { GLS_LOGO, glsNyitvatartas, glsTipusFelirat, glsTipusLogo } from "./gls"
import { isStripeLike } from "@lib/constants"
import { SHOP_ADDRESS } from "@modules/cart/components/pickup-notice/pickup-notice"
import { rendelesSzam } from "@lib/util/rendelesek"

/**
 * A RENDELES-VISSZAIGAZOLO LAP ADATAI (Figma 488:2 / 488:55, valtozatok
 * 488:94), a rendelesbol es a parjabol, tiszta fuggvenyekben.
 *
 * AMIT A KERET MUTAT, DE NEM ALLITUNK, mert nincs mogotte semmi:
 * - "e-mailben küldjük a követési linket": szallitasi level ma nincs (a
 *   Foxpost prompt 11. pontja: kovetesi szamot nem igerunk);
 * - "5 munkanapig tartjuk fenn": nincs ilyen rogzitett szabaly;
 * - "Fizetett összeg", "sikeres": a kartya a leadaskor ZAROLVA van, a
 *   terheles a teljesiteskor jon, tehat "Végösszeg" all helyette.
 */
export const KOVETKEZO_LEPES =
  "Összekészítjük a csomagot. A követési szám akkor jelenik meg, amikor a csomagot feladtuk."

type Pont = {
  id?: string
  name?: string
  address?: string
  variant?: string
  /** GLS: parcel-shop vagy parcel-locker (a hatter irja, G1). */
  type?: string
  hours?: { day: number; from: string; to: string }[]
}

/**
 * A GLS-RENDELES KOVETKEZO LEPESE, szo szerint a GLS-prompt 10. pontjabol: a
 * kovetesi szam a pénztár után még nem feltétlenül létezik.
 */
export const GLS_KOVETKEZO_LEPES =
  "Összekészítjük a csomagot. A GLS követési szám akkor jelenik meg, amikor a csomagot feladtuk."

type Rendeles = {
  id: string
  display_id?: number | string | null
  email?: string | null
  total?: number | null
  items?:
    | {
        id: string
        title?: string | null
        product_title?: string | null
        quantity?: number | null
        unit_price?: number | null
        total?: number | null
        metadata?: Record<string, unknown> | null
      }[]
    | null
  shipping_address?: {
    postal_code?: string | null
    city?: string | null
    address_1?: string | null
  } | null
  shipping_methods?:
    | {
        name?: string | null
        total?: number | null
        amount?: number | null
        data?: Record<string, unknown> | null
      }[]
    | null
  payment_collections?:
    | {
        payments?: { provider_id?: string | null }[] | null
        payment_sessions?: { provider_id?: string | null }[] | null
      }[]
    | null
}

export type Teljesites = {
  cimke: string
  szallito: "foxpost" | "gls" | "bolt" | "haz"
  tipus: string
  hely: string
  cim: string
  tetelek: string[]
  szallitasiDij: number
  /** Utanvetnel az atvetelkor fizetendo osszeg, kulonben null. */
  atvetelkorFizetendo: number | null
  /** Az utanvet kezelesi dija kulon sorban (488:94), ha van; kulonben null. */
  kezelesiDij: number | null
  /** A szolgaltato logoja a `public/images` alatt (GLS); a FOXPOST-e kulon komponens. */
  logo?: string
}

/**
 * AZ UTANVET-DIJ SORA NEM TETEL, hanem dij: a hatter jeloli
 * (`acropora_line_item_kind: "fee"`, `fee_type: "cash_on_delivery"`;
 * backend `cod-fee-line-item.ts`), es a keret szerint kulon pozitiv sor.
 */
const utanvetDijSor = (t: { metadata?: Record<string, unknown> | null }) =>
  t.metadata?.acropora_line_item_kind === "fee" &&
  t.metadata?.fee_type === "cash_on_delivery"

const szolgaltato = (rendeles: Rendeles): string | null => {
  const gyujtes = rendeles.payment_collections?.[0]
  return (
    gyujtes?.payments?.find((p) => p?.provider_id)?.provider_id ??
    gyujtes?.payment_sessions?.find((p) => p?.provider_id)?.provider_id ??
    null
  )
}

const UTANVET = "pp_acropora_cod"
/** The advance bank transfer's provider (backend `modules/acropora-transfer`): it has its own label, it is not "pay at pickup". */
const ELORE_UTALAS = "pp_acropora_transfer"

export function fizetesCimke(
  rendeles: Rendeles,
  t: Translate = translator("hu"),
): string {
  const p = szolgaltato(rendeles) ?? ""
  if (isStripeLike(p)) return t("orderConfirmed.payCard")
  if (p === UTANVET) return t("orderConfirmed.payCod")
  if (p === ELORE_UTALAS) return t("checkoutPayment.modeTransfer")
  return t("orderConfirmed.payAtStore")
}

/**
 * MELYIK MÓD ADJA A SZÁLLÍTÁS TÍPUSÁT ÉS HELYÉT: az, amelyik a díjat hordozza,
 * és ha több ilyen van, amelyik átvételi pontot is hordoz. Az utolsó mód csak
 * döntetlennél számít (barracuda, commerce #630 review): egy mögé kerülő 0 Ft-os
 * mód neve nem lehet a szállítás helye a díj mellett.
 */
function szallitasiMod<
  M extends { total?: number | null; amount?: number | null; data?: unknown },
>(modok: readonly M[]): M | undefined {
  const dijas = (m: M) => Number(m.total ?? m.amount ?? 0) > 0
  const pontos = (m: M) => {
    const adat = (m.data ?? {}) as Record<string, unknown>
    return Boolean(adat.foxpost_pickup_point || adat.gls_pickup_point)
  }
  const rang = (m: M) =>
    dijas(m) && pontos(m) ? 3 : dijas(m) ? 2 : pontos(m) ? 1 : 0
  return modok.reduce<M | undefined>(
    (legjobb, m) => (!legjobb || rang(m) >= rang(legjobb) ? m : legjobb),
    undefined,
  )
}

export function teljesites(
  rendeles: Rendeles,
  bolti: boolean,
  sorszam: number,
  t: Translate = translator("hu"),
): Teljesites {
  const mod = szallitasiMod(rendeles.shipping_methods ?? [])
  const fox = mod?.data?.foxpost_pickup_point as Pont | undefined
  const gls = mod?.data?.gls_pickup_point as Pont | undefined
  const sorok = rendeles.items ?? []
  const tetelek = sorok
    .filter((t) => !utanvetDijSor(t))
    .map((sor) =>
      t("orderConfirmed.itemLine", {
        title: sor.product_title ?? sor.title ?? "",
        quantity: sor.quantity ?? 1,
      }),
    )
  const dijSorok = sorok.filter(utanvetDijSor)
  const kezelesiDij = dijSorok.length
    ? dijSorok.reduce(
        (osszeg, t) =>
          osszeg +
          Number(
            t.total ?? Number(t.unit_price ?? 0) * Number(t.quantity ?? 1),
          ),
        0,
      )
    : null
  /*
    A SZÁLLÍTÁSI DÍJ AZ ÖSSZES MÓD ÖSSZEGE, nem az utolsó módé: a rendelés
    végösszege az összes szállítási módot tartalmazza, és ha mellé kerül egy 0
    Ft-os mód, az utolsó alapján „Ingyenes” látszott 13 500 Ft végösszeg mellett
    (murena saját előnézete, fixtúra: elonezet/visszaigazolo-2026-11-02, acrobot
    40313/40515; a két módú eset valódi rendelésen nem mért, elméleti).
    Egy módnál változatlan.
  */
  const dij = (rendeles.shipping_methods ?? []).reduce(
    (osszeg, m) => osszeg + Number(m.total ?? m.amount ?? 0),
    0,
  )
  const utanvet =
    szolgaltato(rendeles) === UTANVET ? Number(rendeles.total ?? 0) : null
  const alap = {
    tetelek,
    szallitasiDij: dij,
    atvetelkorFizetendo: utanvet,
    kezelesiDij,
  }

  /*
    A TISZTAN BOLTI ATVETELES RENDELES (nem vegyes kosar): a rendelesen nincs
    jelolo, ami kimondana, csak a mod neve ("Személyes átvétel"). A nev itt
    csak arra kell, hogy ne "kiszallitandonak" nevezzuk; ha atnevezik, a lap a
    mod nevet es a cimet mutatja, hamis allitas nelkul.
  */
  if (bolti || (!fox?.name && !gls?.name && /átvétel/i.test(mod?.name ?? ""))) {
    return {
      ...alap,
      cimke: t("orderConfirmed.labelStore", { n: sorszam }),
      szallito: "bolt",
      tipus: "",
      hely: t("orderConfirmed.shopName"),
      cim: SHOP_ADDRESS,
    }
  }
  const cimke = t("orderConfirmed.labelDelivery", { n: sorszam })
  if (fox?.name) {
    return {
      ...alap,
      cimke,
      szallito: "foxpost",
      // a vevo szavaival: egy Z-BOX vagy Z-Pont sem FOXPOST automata (Foxpost-prompt 5.)
      tipus: foxpostPontTipus(fox.variant, t),
      hely: fox.name,
      cim: fox.address ?? "",
    }
  }
  if (gls?.name) {
    // a pont fajtaja (ParcelShop vagy Automata) es a sajat logoja (GLS-prompt 10)
    const nyitva = glsNyitvatartas(gls.hours, t)
    return {
      ...alap,
      cimke,
      szallito: "gls",
      tipus: gls.type
        ? glsTipusFelirat(gls.type)
        : t("checkoutShipping.modeGlsPoint"),
      hely: gls.name,
      cim: [gls.address, nyitva].filter(Boolean).join(" · "),
      logo: glsTipusLogo(gls.type),
    }
  }
  const cim = rendeles.shipping_address
  // a GLS hazhozszallitasat a mod neve mondja meg (a mi elnevezesunk, P4)
  const glsHaz = /^GLS\b/i.test(mod?.name ?? "")
  return {
    ...alap,
    cimke,
    szallito: glsHaz ? "gls" : "haz",
    tipus: mod?.name ?? "",
    hely: mod?.name ?? "",
    cim: [
      [cim?.postal_code, cim?.city].filter(Boolean).join(" "),
      cim?.address_1,
    ]
      .filter(Boolean)
      .join(", "),
    ...(glsHaz ? { logo: GLS_LOGO.altalanos } : {}),
  }
}

/**
 * A LAP: egy rendeles, vagy egy vegyes kosar ket rendelese (a kiszallitott
 * elol), az osszesitovel. `parBolti`: a par a bolti atveteles-e (a jelen
 * rendeles a kiszallitott), vagy forditva.
 */
export function sikeroldal(
  rendeles: Rendeles,
  par: Rendeles | null,
  parBolti: boolean,
  t: Translate = translator("hu"),
) {
  const sorrend: { r: Rendeles; bolti: boolean }[] = par
    ? parBolti
      ? [
          { r: rendeles, bolti: false },
          { r: par, bolti: true },
        ]
      : [
          { r: par, bolti: false },
          { r: rendeles, bolti: true },
        ]
    : [{ r: rendeles, bolti: false }]
  const fo = sorrend[0].r
  return {
    rendelesszam: sorrend.map(({ r }) => rendelesSzam(r.display_id)).join(", "),
    email: rendeles.email ?? fo.email ?? "",
    teljesitesek: sorrend.map(({ r, bolti }, i) =>
      teljesites(r, bolti, i + 1, t),
    ),
    fizetes: fizetesCimke(fo, t),
    vegosszeg: sorrend.reduce((s, { r }) => s + Number(r.total ?? 0), 0),
    rendelesekSzama: sorrend.length,
  }
}
