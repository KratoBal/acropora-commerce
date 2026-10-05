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
  "Összekészítjük a csomagot. A követési szám akkor jelenik meg, amikor az Acropora OS-ben létrehoztuk és feladtuk a küldeményt."

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
  "Összekészítjük a csomagot. A GLS követési szám akkor jelenik meg, amikor az Acropora OS-ben létrehoztuk és feladtuk a küldeményt."

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

export function fizetesCimke(rendeles: Rendeles): string {
  const p = szolgaltato(rendeles) ?? ""
  if (isStripeLike(p)) return "Bankkártya"
  if (p === UTANVET) return "Utánvét"
  return "Fizetés átvételkor"
}

export function teljesites(
  rendeles: Rendeles,
  bolti: boolean,
  sorszam: number,
): Teljesites {
  const mod = rendeles.shipping_methods?.at(-1)
  const fox = mod?.data?.foxpost_pickup_point as Pont | undefined
  const gls = mod?.data?.gls_pickup_point as Pont | undefined
  const sorok = rendeles.items ?? []
  const tetelek = sorok
    .filter((t) => !utanvetDijSor(t))
    .map((t) => `${t.product_title ?? t.title ?? ""} · ${t.quantity ?? 1} db`)
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
  const dij = Number(mod?.total ?? mod?.amount ?? 0)
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
      cimke: `${sorszam}. Személyes átvétel`,
      szallito: "bolt",
      tipus: "",
      hely: "Acropora üzlet",
      cim: SHOP_ADDRESS,
    }
  }
  const cimke = `${sorszam}. Kiszállítandó rendelés`
  if (fox?.name) {
    return {
      ...alap,
      cimke,
      szallito: "foxpost",
      tipus: fox.variant ?? "",
      hely: fox.name,
      cim: fox.address ?? "",
    }
  }
  if (gls?.name) {
    // a pont fajtaja (ParcelShop vagy Automata) es a sajat logoja (GLS-prompt 10)
    const nyitva = glsNyitvatartas(gls.hours)
    return {
      ...alap,
      cimke,
      szallito: "gls",
      tipus: gls.type ? glsTipusFelirat(gls.type) : "GLS csomagpont",
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
    teljesitesek: sorrend.map(({ r, bolti }, i) => teljesites(r, bolti, i + 1)),
    fizetes: fizetesCimke(fo),
    vegosszeg: sorrend.reduce((s, { r }) => s + Number(r.total ?? 0), 0),
    rendelesekSzama: sorrend.length,
  }
}
