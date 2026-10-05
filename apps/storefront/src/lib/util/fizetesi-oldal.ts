import { SHOP_ADDRESS } from "@modules/cart/components/pickup-notice/pickup-notice"

/**
 * A FIZETESI OLDAL ADATAI (Figma 209:3 / 209:133), a kosarbol, tiszta
 * fuggvenyekben, hogy a szoveg merheto legyen. Semmit nem talal ki: ami a
 * kosarban nincs (pl. a Figma "Normál / Nagyméretű" csoportjai, mert nalunk
 * egy szallitott kosarnak EGY szallitasi modja van), az nem jelenik meg.
 */

type Cim =
  | {
      first_name?: string | null
      last_name?: string | null
      company?: string | null
      address_1?: string | null
      address_2?: string | null
      postal_code?: string | null
      city?: string | null
      phone?: string | null
    }
  | null
  | undefined

type Tetel = {
  id: string
  title?: string | null
  product_title?: string | null
  quantity?: number | null
  total?: number | null
}

type Kosar = {
  email?: string | null
  items?: Tetel[] | null
  shipping_address?: Cim
  billing_address?: Cim
  shipping_methods?:
    | {
        name?: string | null
        amount?: number | null
        total?: number | null
        data?: Record<string, unknown> | null
      }[]
    | null
}

// a Figma es a mai cim-osszegzo sorrendje: "Balázs Kratochwill"
const nev = (cim: Cim) =>
  [cim?.first_name, cim?.last_name].filter(Boolean).join(" ").trim()

export const cimSor = (cim: Cim) =>
  [
    [cim?.postal_code, cim?.city].filter(Boolean).join(" "),
    [cim?.address_1, cim?.address_2].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ")

/** "Rendelési adatok": kapcsolattartas es szamlazas. */
export function rendelesiAdatok(kosar: Kosar) {
  const szallitas = kosar.shipping_address
  const szamlazas = kosar.billing_address ?? szallitas
  return {
    kapcsolat: {
      nev: nev(szallitas),
      elerhetoseg: [kosar.email, szallitas?.phone].filter(Boolean).join(" · "),
    },
    szamlazas: {
      nev: szamlazas?.company?.trim() || nev(szamlazas),
      cim: cimSor(szamlazas),
    },
  }
}

export const tetelSor = (tetel: Tetel) => {
  const cim = tetel.product_title ?? tetel.title ?? ""
  return (tetel.quantity ?? 1) > 1 ? `${cim} × ${tetel.quantity}` : cim
}

export type SzallitasiCsoport = {
  cimke: string
  mod: string
  osszeg: number
  tetelek: string[]
  hova: string
}

/**
 * "Szállítási csoportok": a kiszallitando resz a kosar szallitasi modjaval, es
 * vegyes kosarnal az elo allatos resz szemelyes atvetellel (a split-sorok
 * azonositoi a hattertol jonnek: `split_line_ids`).
 */
export function szallitasiCsoportok(
  kosar: Kosar,
  boltiTetelek: ReadonlySet<string>,
): SzallitasiCsoport[] {
  const mod = kosar.shipping_methods?.at(-1)
  const tetelek = kosar.items ?? []
  const pont = (kulcs: string) => {
    const p = mod?.data?.[kulcs] as
      { name?: string; address?: string } | undefined
    return p?.name ? [p.name, p.address].filter(Boolean).join(" · ") : ""
  }
  const csoportok: SzallitasiCsoport[] = []
  const szallitott = tetelek.filter((t) => !boltiTetelek.has(t.id))
  if (mod && szallitott.length) {
    csoportok.push({
      cimke: "Kiszállítás",
      mod: mod.name ?? "",
      osszeg: Number(mod.total ?? mod.amount ?? 0),
      tetelek: szallitott.map(tetelSor),
      hova:
        pont("foxpost_pickup_point") ||
        pont("gls_pickup_point") ||
        cimSor(kosar.shipping_address),
    })
  }
  const bolti = tetelek.filter((t) => boltiTetelek.has(t.id))
  if (bolti.length) {
    csoportok.push({
      cimke: "Élőállat",
      mod: "Személyes átvétel",
      osszeg: 0,
      tetelek: bolti.map(tetelSor),
      hova: SHOP_ADDRESS,
    })
  }
  return csoportok.map((cs, i) => ({ ...cs, cimke: `${i + 1}. ${cs.cimke}` }))
}
