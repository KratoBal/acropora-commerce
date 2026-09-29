/**
 * A MENTETT CIMEK (P5, 257:51): a kartya szovege es az urlap ket uj mezoje.
 * Tiszta fuggvenyek; a mentes a `lib/data/customer.ts`-ben van.
 */
type Cim = {
  id?: string
  address_name?: string | null
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  address_2?: string | null
  postal_code?: string | null
  city?: string | null
  is_default_shipping?: boolean | null
}

/**
 * A kartya cime (257:89): a cim neve ("Otthon"). Nev nelkul a cimzett neve,
 * magyar sorrendben; ha az sincs, "Cím".
 */
export function cimCim(cim: Cim): string {
  const nev = (cim.address_name ?? "").trim()
  if (nev) return nev
  const cimzett = [cim.last_name, cim.first_name]
    .map((r) => (r ?? "").trim())
    .filter(Boolean)
    .join(" ")
  return cimzett || "Cím"
}

/** A kartya sora (257:91): "1111 Budapest, Minta utca 12." */
export function cimSor(cim: Cim): string {
  const varos = [cim.postal_code, cim.city]
    .map((r) => (r ?? "").trim())
    .filter(Boolean)
    .join(" ")
  const utca = [cim.address_1, cim.address_2]
    .map((r) => (r ?? "").trim())
    .filter(Boolean)
    .join(", ")
  return [varos, utca].filter(Boolean).join(", ")
}

/** Az alapertelmezett cim elol all, a tobbi a mentes sorrendjeben. */
export function rendezettCimek<T extends Cim>(cimek: readonly T[]): T[] {
  return [...cimek].sort(
    (a, b) => Number(!!b.is_default_shipping) - Number(!!a.is_default_shipping),
  )
}

/**
 * AZ URLAP KET UJ MEZOJE. A regi hivo (a szamlazasi cim szerkesztoje) ezeket
 * nem kuldi, ezert CSAK AKKOR olvassuk oket, ha az urlap tartalmazza:
 *
 * - a cim neve: ha a mezo ott van, az ures ertek torli (`null`);
 * - az alapertelmezett jelolo: egy bejeloletlen pipa semmit nem kuld, ezert a
 *   mellette allo rejtett `alapertelmezett_mezo` jelzi, hogy az urlapon volt.
 */
export function cimNevUrlapbol(urlap: FormData): string | null | undefined {
  if (!urlap.has("address_name")) return undefined
  const nev = String(urlap.get("address_name") ?? "").trim()
  return nev || null
}

export function alapertelmezettUrlapbol(
  urlap: FormData,
  eddigi: boolean | undefined,
): boolean | undefined {
  if (!urlap.has("alapertelmezett_mezo")) return eddigi
  return urlap.get("is_default_shipping") === "on"
}

/** A cim-ablakok szoveges mezoi, ahogy az urlap kuldi oket. */
const CIM_URLAP_MEZOK = [
  "address_name",
  "first_name",
  "last_name",
  "company",
  "address_1",
  "address_2",
  "postal_code",
  "city",
  "province",
  "country_code",
  "phone",
] as const

/**
 * A BEKULDOTT CIM, hibanal visszaadva (a #418 mintajara): a React 19 az action
 * utan alaphelyzetbe allitja az urlapot, es a mezok ebbol toltodnek vissza. A
 * pipa "on" vagy ures.
 */
export function cimUrlapErtekek(urlap: FormData): Record<string, string> {
  const ertekek: Record<string, string> = {}
  for (const nev of CIM_URLAP_MEZOK) ertekek[nev] = String(urlap.get(nev) ?? "")
  ertekek.is_default_shipping =
    urlap.get("is_default_shipping") === "on" ? "on" : ""
  return ertekek
}

