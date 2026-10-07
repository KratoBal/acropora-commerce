/**
 * EGY TESZT-KOSAR A PENZTAR LEPESEIHEZ (FE-9, akadalymentesseg).
 *
 * A penztar csak teli kosarral jelenik meg (ures kosarnal a kosar lapjara
 * iranyit, `checkout/page.tsx`). Ezert a teszt a Store API-n letrehoz egy
 * kosarat, betesz egy vasarolhato tetelt, kitolti a cimet es egy szallitasi
 * modot -- pontosan azt, amit egy latogato tesz, es a kosar befejezetlen marad.
 *
 * CSAK A TESZT BOLTBAN: a backend cime a `TESZT_HOSZTOK` egyike kell legyen,
 * kulonben a fuggveny nem ir semmit, hanem az okkal ter vissza. Egy elesre
 * allitott kornyezetben futtatott teszt igy nem hagy kosarat az eles boltban.
 */
export const TESZT_HOSZTOK = [
  "commerce-stage.acropora.hu",
  "localhost",
] as const

export type KosarAllapot =
  | { kosarId: string; lepesek: ("address" | "delivery" | "payment")[] }
  | { kosarId: null; ok: string }

type Kapcsolat = { backend: string; kulcs: string; orszag: string }

async function hivas<T>(
  k: Kapcsolat,
  modszer: "GET" | "POST",
  ut: string,
  torzs?: unknown,
): Promise<T> {
  const valasz = await fetch(`${k.backend}${ut}`, {
    method: modszer,
    headers: {
      "x-publishable-api-key": k.kulcs,
      "content-type": "application/json",
    },
    body: torzs === undefined ? undefined : JSON.stringify(torzs),
  })
  if (!valasz.ok)
    throw new Error(`${modszer} ${ut}: ${valasz.status} ${await valasz.text()}`)
  return (await valasz.json()) as T
}

const CIM = {
  first_name: "Teszt",
  last_name: "Akadálymentesség",
  address_1: "Teszt utca 1.",
  city: "Budapest",
  postal_code: "1111",
  phone: "+36301234567",
}

export async function tesztKosar(k: Kapcsolat): Promise<KosarAllapot> {
  const hoszt = new URL(k.backend).hostname
  if (!(TESZT_HOSZTOK as readonly string[]).includes(hoszt))
    return {
      kosarId: null,
      ok: `a backend (${hoszt}) nem teszt bolt: nem írunk bele`,
    }

  const { regions } = await hivas<{
    regions: { id: string; countries?: { iso_2?: string }[] }[]
  }>(k, "GET", "/store/regions")
  const regio =
    regions.find((r) => r.countries?.some((c) => c.iso_2 === k.orszag)) ??
    regions[0]
  if (!regio) return { kosarId: null, ok: "a boltnak nincs régiója" }

  type V = {
    id: string
    manage_inventory?: boolean
    inventory_quantity?: number
  }
  const { products } = await hivas<{
    products: { handle: string; variants?: V[] }[]
  }>(
    k,
    "GET",
    `/store/products?limit=200&region_id=${regio.id}&order=handle&fields=handle,*variants,%2Bvariants.inventory_quantity`,
  )
  const jeloltek = products.flatMap((p) =>
    (p.variants ?? []).filter(
      (v) => !v.manage_inventory || (v.inventory_quantity ?? 0) > 0,
    ),
  )
  if (!jeloltek.length)
    return {
      kosarId: null,
      ok: "nincs vásárolható tétel az első 200 termékben",
    }

  const { cart } = await hivas<{ cart: { id: string } }>(
    k,
    "POST",
    "/store/carts",
    {
      region_id: regio.id,
    },
  )
  let betett = false
  for (const v of jeloltek.slice(0, 5)) {
    try {
      await hivas(k, "POST", `/store/carts/${cart.id}/line-items`, {
        variant_id: v.id,
        quantity: 1,
      })
      betett = true
      break
    } catch {
      // a kovetkezo jelolt; a keszlet a lekeres ota elfogyhatott
    }
  }
  if (!betett)
    return { kosarId: null, ok: "egyik jelölt tétel sem került a kosárba" }

  const lepesek: ("address" | "delivery" | "payment")[] = ["address"]
  const cim = { ...CIM, country_code: k.orszag }
  await hivas(k, "POST", `/store/carts/${cart.id}`, {
    email: "seo-a11y-teszt@example.com",
    shipping_address: cim,
    billing_address: cim,
  })
  lepesek.push("delivery")
  const { shipping_options } = await hivas<{
    shipping_options: { id: string }[]
  }>(k, "GET", `/store/shipping-options?cart_id=${cart.id}`)
  for (const o of shipping_options) {
    try {
      await hivas(k, "POST", `/store/carts/${cart.id}/shipping-methods`, {
        option_id: o.id,
      })
      lepesek.push("payment")
      break
    } catch {
      // a szamolt aru mod cim nelkul elutasithat; a kovetkezo
    }
  }
  return { kosarId: cart.id, lepesek }
}
