import { boltHibanakLatszik } from "./build-time-failure"

/**
 * BUILD KOZBENI UJRAPROBALAS A BOLT ATMENETI KIESESERE (kartya 62811c0f;
 * felmeres: agents/nautilus/megosztas/kirakat-build-backend-fugges-2026-10-07.md).
 *
 * A build kb. 390 lapot epit elore, es mindegyik a stage Store API-t kerdezi.
 * Egyetlen 502 barmelyik lap kozben eleg volt a piros kapuhoz. Ma (2026-10-07
 * 14:22 UTC, #528, `Bad Gateway`) ez a HARMADIK dokumentalt eset, tehat
 * teljesult a `build-time-failure` fejleceben allo ujranyitasi feltetel.
 *
 * === MI VALTOZIK, ES MI NEM ===
 *
 * A rovid kieses (masodpercek, egy ujratelepites elso perce) mostantol nem
 * bukatja a buildet: a kerest kb. egy percig ujraprobaljuk. A HOSSZU kieses
 * tovabbra is PIROS, ahogy a 2026-09-07-i dontes kerte: a nemasag a rosszabb.
 * Csak most a lap-renderelesi bukas is MEGNEVEZETT, nem csak a lap-lista
 * begyujtese (`epitesiHibaMegnevezve`): az URL-lel es azzal, hogy nem kod-hiba.
 *
 * === A NEGY FELTETEL, MIND EGYSZERRE ===
 *
 *   build kozben   a `NEXT_PHASE` a build-fazis. Futasidoben NEM: egy vasarlot
 *                  nem varakoztatunk egy percig.
 *   GET            az iras nem ismetelheto biztonsagosan.
 *   atmeneti hiba  502, 503, 504, vagy halozati hiba. Egy 4xx (rossz kulcs,
 *                  nem letezo lap) azonnal bukik, ahogy eddig.
 *   keret          2, 4, 8, 16 es 30 mp varakozas, osszesen 60 mp; utana a
 *                  hiba tovabbmegy.
 */

export const EPITES_FAZIS = "phase-production-build"

/** A probak kozti varakozas, ezredmasodpercben. Osszege a keret: 60 mp. */
export const VARAKOZASOK_MS = [2_000, 4_000, 8_000, 16_000, 30_000] as const

const ATMENETI_STATUSZOK = new Set([502, 503, 504])

/**
 * Atmeneti-e a hiba. A HTTP-hibat az SDK `FetchError`-ja hordozza `status`
 * mezovel; ha van statusz, CSAK az dont (egy 404 szovege sem fordithatja at).
 * Statusz nelkul halozati hiba lehet: azt a meglevo felismero dont el.
 */
export function atmenetiHiba(error: unknown): boolean {
  const status = (error as { status?: unknown } | null)?.status
  if (typeof status === "number") return ATMENETI_STATUSZOK.has(status)
  return boltHibanakLatszik(error)
}

export interface UjraprobalasOpciok {
  /** a futas fazisa; alapbol a `process.env.NEXT_PHASE` */
  fazis?: string
  varakozasok?: readonly number[]
  /** a teszt nem var tenylegesen: beinjektalt ora */
  alszik?: (ms: number) => Promise<void>
  naplo?: (sor: string) => void
  boltCime?: string
}

const alvas = (ms: number) =>
  new Promise<void>((resolve) => setTimeout(resolve, ms))

/**
 * A kerest build kozben, atmeneti hibanal ujraprobalja; minden mas esetben
 * egyszer hivja, valtozatlanul.
 */
export async function epitesKozbenUjraprobal<T>(
  hivas: () => Promise<T>,
  keres: { method?: string; url: string },
  opciok: UjraprobalasOpciok = {},
): Promise<T> {
  const fazis = opciok.fazis ?? process.env.NEXT_PHASE
  const method = (keres.method ?? "GET").toUpperCase()
  if (fazis !== EPITES_FAZIS || method !== "GET") return hivas()

  const varakozasok = opciok.varakozasok ?? VARAKOZASOK_MS
  const alszik = opciok.alszik ?? alvas
  const naplo = opciok.naplo ?? ((sor: string) => console.error(sor))

  for (let proba = 0; ; proba++) {
    try {
      return await hivas()
    } catch (error) {
      if (!atmenetiHiba(error)) throw error
      const varakozas = varakozasok[proba]
      if (varakozas === undefined) {
        naplo(feladasUzenet(keres.url, error, varakozasok, opciok.boltCime))
        throw error
      }
      naplo(
        `A bolt atmenetileg nem valaszol (${hibaSzoveg(error)}): ${keres.url}. ` +
          `Ujraprobalas ${proba + 1}/${varakozasok.length}, ${varakozas / 1000} mp mulva.`,
      )
      await alszik(varakozas)
    }
  }
}

function hibaSzoveg(error: unknown): string {
  const status = (error as { status?: unknown } | null)?.status
  const uzenet = error instanceof Error ? error.message : String(error)
  return typeof status === "number" ? `HTTP ${status} ${uzenet}` : uzenet
}

/**
 * A FELADAS UZENETE: melyik URL, mennyi ido utan, es hogy nem kod-hiba. A
 * bukott LAPOT a Next nevezi meg a naplo vegen (merve egy elerhetetlen hatter
 * elleni buildben, 2026-10-07): lap-renderelesnel "Error occurred
 * prerendering page", a lap-lista begyujtesenel "Failed to collect page data
 * for /[countryCode]/collections/[handle]". A burkolo a bongeszos kodba is
 * bekerul, ezert a Next belso, csak szerveren elerheto tarolojahoz nem nyulunk.
 */
export function feladasUzenet(
  url: string,
  error: unknown,
  varakozasok: readonly number[] = VARAKOZASOK_MS,
  boltCime = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ??
    "(nincs cim beallitva)",
): string {
  const keret = varakozasok.reduce((osszeg, ms) => osszeg + ms, 0) / 1000
  return [
    "",
    `A BOLT NEM VALASZOL (${boltCime}), ${varakozasok.length + 1} probabol egy sem sikerult, ${keret} mp alatt.`,
    "",
    `A keres: ${url}`,
    `Az utolso hiba: ${hibaSzoveg(error)}`,
    "",
    "EZ NEM KOD-HIBA. A build a lapokat EPITES KOZBEN kerdezi le a bolttol.",
    "A bukott lapot a Next nevezi meg a naplo vegen: 'Error occurred prerendering page'",
    "(lap-rendereles) vagy 'Failed to collect page data for' (lap-lista).",
    "",
    "TEENDO: nezd meg, fut-e a bolt, es ha igen, INDITSD UJRA a futast.",
    "",
  ].join("\n")
}
