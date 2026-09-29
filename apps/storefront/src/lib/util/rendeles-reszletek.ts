/**
 * A RENDELES RESZLETEI (P5, 249:96; mobilon 249:252): a fizetesi mod, az
 * osszesito sorai, a termektetelek. Tiszta fuggvenyek a Medusa rendelesebol.
 */
import { paymentInfoMap } from "@lib/constants"

type Tetel = {
  id: string
  title?: string | null
  product_title?: string | null
  quantity?: number | null
  total?: number | null
  metadata?: Record<string, unknown> | null
}

type Rendeles = {
  items?: Tetel[] | null
  shipping_methods?:
    | { name?: string | null; total?: number | null; amount?: number | null }[]
    | null
  shipping_total?: number | null
  total?: number | null
  payment_status?: string | null
  payment_collections?:
    | {
        payments?: { provider_id?: string | null }[] | null
        payment_sessions?: { provider_id?: string | null }[] | null
      }[]
    | null
}

/**
 * A DIJSOR (utanveti kezelesi dij) a backendben `acropora_line_item_kind: fee`
 * jelolest kap (a `cod-fee-line-item.ts` szerint). A Tételek listajaban nem
 * termek, az osszesitoben kulon sor.
 */
export function dijSor(tetel: Tetel): boolean {
  return tetel.metadata?.acropora_line_item_kind === "fee"
}

export function termekTetelek<T extends Tetel>(rendeles: {
  items?: T[] | null
}): T[] {
  return (rendeles.items ?? []).filter((t) => !dijSor(t))
}

/**
 * A fizetesi mod neve a penztar szotarabol (`paymentInfoMap`: "Utánvét",
 * "Fizetés átvételkor"). Elobb a kesz fizetesbol, utana a munkamenetbol;
 * ismeretlen szolgaltatonal ures, nem a nyers azonosito.
 */
export function fizetesiMod(rendeles: Rendeles): string {
  const gyujtemeny = rendeles.payment_collections?.[0]
  const szolgaltato =
    gyujtemeny?.payments?.[0]?.provider_id ??
    gyujtemeny?.payment_sessions?.[0]?.provider_id ??
    ""
  return paymentInfoMap[szolgaltato]?.title ?? ""
}

export type OsszesitoSor = { cimke: string; osszeg: number }

/**
 * AZ OSSZESITES SORAI (249:172): Termékek, a dijsorok a sajat cimukkel, a
 * szallitasi mod(ok) a nevukkel. A keret csoportonkenti szallitasi sorai
 * (Foxpost, GLS, Élőállat átvétel) a P4 hattere; itt a Medusa szallitasi
 * modjai allnak, ahogy a rendelesben vannak.
 */
export function osszesitoSorok(rendeles: Rendeles): OsszesitoSor[] {
  const termekek = termekTetelek(rendeles).reduce(
    (osszeg, t) => osszeg + (t.total ?? 0),
    0,
  )
  const dijak = (rendeles.items ?? [])
    .filter(dijSor)
    .map((t) => ({ cimke: t.title ?? "Díj", osszeg: t.total ?? 0 }))
  const szallitas = (rendeles.shipping_methods ?? []).map((m) => ({
    cimke: m.name ?? "Szállítás",
    osszeg: m.total ?? m.amount ?? 0,
  }))
  return [{ cimke: "Termékek", osszeg: termekek }, ...dijak, ...szallitas]
}

/**
 * A vegosszeg cimkeje: "Fizetett összeg" csak akkor, ha a fizetes tenyleg
 * megtortent (a keret ezt irja, 249:188); utanvetnel es fizetesre varva
 * "Végösszeg", kulonben a lap valotlant allitana.
 */
export function vegosszegCimke(
  paymentStatus: string | null | undefined,
): string {
  return paymentStatus === "captured" ? "Fizetett összeg" : "Végösszeg"
}
