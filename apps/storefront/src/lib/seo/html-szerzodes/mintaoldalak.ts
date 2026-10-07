/**
 * A SZERZODES-TESZT MINTAOLDALAI, A BOLT ADATABOL KIVALASZTVA (SEO frontend FE-8,
 * roadmap 3/B, a fixtura-keszlet).
 *
 * MIERT NEM BEIRT CIMEK: a teszt bolt katalogusa ujratoltodik (2026-09-25-en
 * egeszben), es egy beirt termek-cim egy ujratoltes utan 404-et adna -- a teszt
 * akkor a katalogust merne, nem a kirakatot. Ehelyett minden mintat egy SZABALY
 * valaszt ki a Store API-bol, determinisztikusan (handle szerint rendezve), tehat
 * ugyanazon az adaton mindig ugyanaz a lap.
 *
 * HA EGY MINTARA NINCS ADAT, a minta `null`, es az oka a `hianyzik` mezoben all. A
 * teszt ezt kiirja, nem hallgatja el. Merve 2026-10-07: a teszt boltban NINCS
 * tobb-valtozatos termek (1492-bol 0), tehat a `?v_id` minta ma hianyzik.
 */
export type MintaTipus =
  | "kezdolap"
  | "termek-gtin"
  | "termek-gtin-nelkul"
  | "termek-elfogyott"
  | "termek-valtozatos"
  | "kategoria-felso"
  | "kategoria-level"
  | "kategoria-lap2"
  | "marka"
  | "kereses"
  | "facet"
  | "nem-letezo"

export type Minta = {
  tipus: MintaTipus
  /** a kirakat utja, orszagkoddal es query-vel */
  ut: string | null
  hianyzik?: string
  /** a `termek-valtozatos` mintanal: a nem alapertelmezett valtozat */
  valtozat?: { id: string; opciok: string[] }
}

type Valtozat = {
  id: string
  sku?: string | null
  barcode?: string | null
  ean?: string | null
  upc?: string | null
  manage_inventory?: boolean | null
  inventory_quantity?: number | null
  calculated_price?: { calculated_amount?: number | null } | null
  options?: { value?: string | null }[] | null
}
type Termek = {
  id: string
  handle: string
  title: string
  collection_id?: string | null
  variants?: Valtozat[]
  categories?: { id: string }[]
}
type Kategoria = {
  id: string
  handle: string
  parent_category_id: string | null
}
type Gyujtemeny = { id: string; handle: string }

export type BoltKapcsolat = {
  backend: string
  kulcs: string
  orszag: string
  /** tesztben kicserelheto */
  fetch?: typeof fetch
}

/** a lapozo lapmerete a kategorian (`category-products.tsx`) */
const LAPMERET = 12

const gtin = (v: Valtozat) => !!(v.barcode || v.ean || v.upc)
const elfogyott = (t: Termek) =>
  !!t.variants?.length &&
  t.variants.every(
    (v) => v.manage_inventory && (v.inventory_quantity ?? 0) <= 0,
  )
const handleSzerint = <T extends { handle: string }>(a: T, b: T) =>
  a.handle.localeCompare(b.handle)

async function lekeres<T>(
  b: BoltKapcsolat,
  ut: string,
  q: Record<string, string>,
): Promise<T> {
  const f = b.fetch ?? fetch
  const valasz = await f(`${b.backend}${ut}?${new URLSearchParams(q)}`, {
    headers: { "x-publishable-api-key": b.kulcs },
  })
  if (!valasz.ok) throw new Error(`Store API ${ut}: ${valasz.status}`)
  return (await valasz.json()) as T
}

async function mindenTermek(
  b: BoltKapcsolat,
  regioId: string,
): Promise<Termek[]> {
  const termekek: Termek[] = []
  for (let offset = 0; ; offset += 200) {
    const d = await lekeres<{ products: Termek[]; count: number }>(
      b,
      "/store/products",
      {
        limit: "200",
        offset: String(offset),
        region_id: regioId,
        fields:
          "id,handle,title,collection_id,*variants,*variants.options,+variants.inventory_quantity,+variants.calculated_price,*categories",
      },
    )
    termekek.push(...d.products)
    if (offset + 200 >= d.count) return termekek
  }
}

/** A tiszta valasztas: a bolt adatabol a mintak (halozat nelkul tesztelheto). */
export function mintakAdatbol(
  orszag: string,
  termekek: Termek[],
  kategoriak: Kategoria[],
  gyujtemenyek: Gyujtemeny[],
): Minta[] {
  const p = (ut: string) => `/${orszag}${ut}`
  const rendezett = [...termekek].sort(handleSzerint)
  const termekUt = (t: Termek | undefined, tipus: MintaTipus, ok: string) =>
    t
      ? { tipus, ut: p(`/products/${t.handle}`) }
      : { tipus, ut: null, hianyzik: ok }

  const gtinos = rendezett.find((t) => t.variants?.some(gtin))
  const gtinNelkul = rendezett.find((t) => !t.variants?.some(gtin))
  const elfogy = rendezett.find(
    (t) => elfogyott(t) && t !== gtinos && t !== gtinNelkul,
  )
  /*
    A VALTOZATOT AZ OPCIOI KULONBOZTETIK MEG, NEM AZ ARA: a meres a kijelolt
    opcio-gombot nezi (`valtozatHibak`), tehat olyan valtozat kell, aminek az
    opcio-ertekei masok, mint az elso valtozate.
  */
  const opciok = (v: Valtozat) =>
    (v.options ?? [])
      .map((o) => (o.value ?? "").trim())
      .filter(Boolean)
      .sort()
  const masOpciok = (t: Termek) => {
    const elso = t.variants?.[0]
    return elso
      ? t.variants!.find(
          (v) =>
            opciok(v).length > 0 &&
            opciok(v).join("|") !== opciok(elso).join("|"),
        )
      : undefined
  }
  const valtozatos = rendezett.find((t) => masOpciok(t) !== undefined)

  const termekSzam = new Map<string, number>()
  for (const t of termekek)
    for (const k of t.categories ?? [])
      termekSzam.set(k.id, (termekSzam.get(k.id) ?? 0) + 1)
  const szulok = new Set(kategoriak.map((k) => k.parent_category_id))
  const katRendezett = [...kategoriak].sort(handleSzerint)
  const felso = katRendezett.find(
    (k) => !k.parent_category_id && szulok.has(k.id),
  )
  const level = [...katRendezett]
    .filter((k) => !szulok.has(k.id) && (termekSzam.get(k.id) ?? 0) > 0)
    .sort(
      (a, b) => (termekSzam.get(b.id) ?? 0) - (termekSzam.get(a.id) ?? 0),
    )[0]
  const levelTermekei = level
    ? rendezett.filter((t) => t.categories?.some((k) => k.id === level.id))
    : []
  const facetMarka = levelTermekei.find((t) => t.collection_id)?.collection_id
  const gyujtemenyIdk = new Set(termekek.map((t) => t.collection_id))
  const marka = [...gyujtemenyek]
    .sort(handleSzerint)
    .find((g) => gyujtemenyIdk.has(g.id))
  const keresoSzo = (gtinos ?? rendezett[0])?.title
    .split(/\s+/)
    .find((s) => s.length >= 4)

  const valtozat = valtozatos ? masOpciok(valtozatos) : undefined
  return [
    { tipus: "kezdolap", ut: p("") },
    termekUt(gtinos, "termek-gtin", "nincs GTIN-es termék a boltban"),
    termekUt(gtinNelkul, "termek-gtin-nelkul", "minden terméknek van GTIN-je"),
    termekUt(elfogy, "termek-elfogyott", "nincs elfogyott termék"),
    valtozatos && valtozat
      ? {
          tipus: "termek-valtozatos",
          ut: p(`/products/${valtozatos.handle}?v_id=${valtozat.id}`),
          valtozat: { id: valtozat.id, opciok: opciok(valtozat) },
        }
      : {
          tipus: "termek-valtozatos",
          ut: null,
          hianyzik:
            "nincs eltérő opciójú változatokkal bíró termék a boltban (a változatok a P0 PR 3-mal jönnek)",
        },
    felso
      ? { tipus: "kategoria-felso", ut: p(`/categories/${felso.handle}`) }
      : {
          tipus: "kategoria-felso",
          ut: null,
          hianyzik: "nincs felső kategória",
        },
    level
      ? { tipus: "kategoria-level", ut: p(`/categories/${level.handle}`) }
      : {
          tipus: "kategoria-level",
          ut: null,
          hianyzik: "nincs termékes levél-kategória",
        },
    level && (termekSzam.get(level.id) ?? 0) > LAPMERET
      ? { tipus: "kategoria-lap2", ut: p(`/categories/${level.handle}?page=2`) }
      : {
          tipus: "kategoria-lap2",
          ut: null,
          hianyzik: `nincs ${LAPMERET}-nél több termékű levél-kategória`,
        },
    marka
      ? { tipus: "marka", ut: p(`/collections/${marka.handle}`) }
      : { tipus: "marka", ut: null, hianyzik: "nincs termékes márka" },
    keresoSzo
      ? { tipus: "kereses", ut: p(`/store?q=${encodeURIComponent(keresoSzo)}`) }
      : { tipus: "kereses", ut: null, hianyzik: "nincs keresőszó" },
    level && facetMarka
      ? {
          tipus: "facet",
          ut: p(`/categories/${level.handle}?marka=${facetMarka}`),
        }
      : {
          tipus: "facet",
          ut: null,
          hianyzik: "a levél-kategória termékeinek nincs márkája",
        },
    {
      tipus: "nem-letezo",
      ut: p("/products/nincs-ilyen-termek-seo-szerzodes"),
    },
  ]
}

/** A mintak a bolt Store API-jabol. */
export async function mintak(b: BoltKapcsolat): Promise<Minta[]> {
  const { regions } = await lekeres<{
    regions: { id: string; countries?: { iso_2?: string }[] }[]
  }>(b, "/store/regions", {})
  const regio =
    regions.find((r) => r.countries?.some((c) => c.iso_2 === b.orszag)) ??
    regions[0]
  if (!regio) throw new Error("a boltnak nincs régiója")
  const [termekek, kat, gyujt] = await Promise.all([
    mindenTermek(b, regio.id),
    lekeres<{ product_categories: Kategoria[] }>(
      b,
      "/store/product-categories",
      { limit: "1000", fields: "id,handle,parent_category_id" },
    ),
    lekeres<{ collections: Gyujtemeny[] }>(b, "/store/collections", {
      limit: "1000",
      fields: "id,handle",
    }),
  ])
  return mintakAdatbol(
    b.orszag,
    termekek,
    kat.product_categories,
    gyujt.collections,
  )
}
