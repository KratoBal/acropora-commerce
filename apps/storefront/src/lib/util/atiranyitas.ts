/**
 * A RÉGI CÍMEK 301-E (SEO P0 PR 7c). A lista gazdája az OS (`UrlRedirect`, PR
 * 6), a backend `GET /store/redirects` adja (PR 7a), és a middleware az
 * országkód-átirányítás ELŐTT nézi meg, hogy a régi UNAS-cím (`/Pumpa`, ország
 * nélkül) egyetlen 301-gyel érjen célba, 307 → 301 lánc nélkül.
 *
 * A KULCS UGYANAZ A NORMALIZÁLÁS, MINT AZ OS-BEN (`redirect-path.ts`):
 * percent-dekódolt, NFC, záró `/` nélkül, és kisbetűs (a lista kulcsa a
 * kisbetűs forrás). A query nem része a kulcsnak.
 */
export function atiranyitasKulcs(pathname: string): string | null {
  let ut = pathname
  try {
    ut = decodeURIComponent(ut)
  } catch {
    // egy hibás percent-kód nyersen marad, ahogy az OS-ben
  }
  ut = ut.normalize("NFC")
  if (/[\s\u0000-\u001f\u007f]/.test(ut)) return null
  if (!ut.startsWith("/")) ut = `/${ut}`
  while (ut.length > 1 && ut.endsWith("/")) ut = ut.slice(0, -1)
  return ut.toLowerCase()
}

export type AtiranyitasCel = { cel: string; statusz: number }

/** A 301 böngésző-tárolása (D1, acrobot 27850): egy hibás szabály egy napon belül javul. */
export const ATIRANYITAS_CACHE_CONTROL = "public, max-age=86400"

const ELETTARTAM_MS = 300_000
/** Egy sikertelen betöltés után ennyi ideig nem próbálja újra (nem terheli a backendet). */
const HIBA_UTAN_MS = 30_000

type Allapot = { lista: Map<string, AtiranyitasCel>; ervenyes: number } | null
let allapot: Allapot = null

/** Csak a teszteknek: a modul-szintű lista ürítése. */
export function atiranyitasListaUrites() {
  allapot = null
}

/**
 * A LISTA, MEMÓRIÁBAN. Kérésenként nincs backend-hívás, csak egy Map-keresés; a
 * lista 300 másodpercig él, és a backend írásakor a `redirects` címke a
 * gyorsítótárat is üríti.
 *
 * AZ ELSŐ KÉRÉS: ha a betöltés nem sikerül, a lista üres marad, tehát NINCS
 * átirányítás, és a kérés a mai úton megy tovább. Egy hibás 301-et a böngésző
 * eltárol; egy kimaradt átirányítás a következő kérésnél pótlódik.
 */
export async function atiranyitasLista(
  backend: string,
  publishableKey: string,
  most = Date.now(),
): Promise<Map<string, AtiranyitasCel>> {
  if (allapot && most < allapot.ervenyes) return allapot.lista
  try {
    const valasz = await fetch(`${backend}/store/redirects`, {
      headers: { "x-publishable-api-key": publishableKey },
      next: { revalidate: ELETTARTAM_MS / 1000, tags: ["redirects"] },
    })
    if (!valasz.ok) throw new Error(`HTTP ${valasz.status}`)
    const { redirects } = (await valasz.json()) as {
      redirects?: [string, string, number][]
    }
    const lista = new Map<string, AtiranyitasCel>()
    for (const [forras, cel, statusz] of redirects ?? [])
      lista.set(forras, { cel, statusz })
    allapot = { lista, ervenyes: most + ELETTARTAM_MS }
  } catch {
    allapot = {
      lista: allapot?.lista ?? new Map(),
      ervenyes: most + HIBA_UTAN_MS,
    }
  }
  return allapot.lista
}

export function atiranyitasCelja(
  lista: Map<string, AtiranyitasCel>,
  pathname: string,
): AtiranyitasCel | null {
  const kulcs = atiranyitasKulcs(pathname)
  return kulcs ? (lista.get(kulcs) ?? null) : null
}
