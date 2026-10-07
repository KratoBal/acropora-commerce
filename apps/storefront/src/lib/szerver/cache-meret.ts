import { lstat, readdir, stat } from "node:fs/promises"
import { join } from "node:path"

/**
 * A `.next/cache` MERETFIGYELESE (FE-7; barracuda 2026-10-07, a roadmap
 * „Gyorsitotar-toltes kivulrol” sora). Az ISR minden uj URL-t eltarol, az
 * idegen `v_id` 404-eit is: a gyorsitotar kivulrol tolthető. A sebessegkorlat
 * a proxy dolga (infra); ez a kirakat oldala: meri a meretet, es ha a hatar
 * fole er, egy NEV SZERINT kereshető sort ir a naploba:
 *
 *   CACHE-MERET-RIASZTAS {"mb":..., "hatarMb":..., "konyvtar":...}
 *
 * A riasztas bekotese (a naplo-sor figyelese) az infra resze.
 *
 * Beallitas:
 *   CACHE_MERET_HATAR_MB      a hatar, alapbol 2048
 *   CACHE_MERET_PERC          a meres gyakorisaga percben, alapbol 15 (min. 1)
 */

/** Egy konyvtar teljes merete bajtban; a szimbolikus linkeket nem koveti. */
export async function konyvtarMeret(konyvtar: string): Promise<number> {
  let osszeg = 0
  let bejegyzesek: string[]
  try {
    bejegyzesek = await readdir(konyvtar)
  } catch {
    return 0 // meg nincs gyorsitotar
  }
  for (const nev of bejegyzesek) {
    const ut = join(konyvtar, nev)
    const adat = await lstat(ut).catch(() => null)
    if (!adat || adat.isSymbolicLink()) continue
    osszeg += adat.isDirectory() ? await konyvtarMeret(ut) : adat.size
  }
  return osszeg
}

const szamBeallitas = (
  ertek: string | undefined,
  alap: number,
  min: number,
) => {
  const szam = Number(ertek)
  return ertek && Number.isFinite(szam) && szam >= min ? szam : alap
}

export interface CacheMeretBeallitas {
  konyvtar: string
  hatarMb: number
  intervallumMs: number
}

export function cacheMeretBeallitas(
  env: Record<string, string | undefined> = process.env,
  cwd = process.cwd(),
): CacheMeretBeallitas {
  return {
    konyvtar: join(cwd, ".next", "cache"),
    hatarMb: szamBeallitas(env.CACHE_MERET_HATAR_MB, 2048, 1),
    intervallumMs: szamBeallitas(env.CACHE_MERET_PERC, 15, 1) * 60_000,
  }
}

/** Letezik-e a gyorsitotar konyvtara (es konyvtar-e). */
export async function konyvtarLetezik(konyvtar: string): Promise<boolean> {
  const adat = await stat(konyvtar).catch(() => null)
  return adat?.isDirectory() ?? false
}

/**
 * Egy meres: a hatar folott riasztas-sort ir, es visszaadja a meretet MB-ban.
 *
 * A HIANYZO KONYVTAR KULON, MEGNEVEZETT SOR (barracuda, #530): egy nem letezo
 * konyvtar merete 0 lenne, ugyanugy, mint egy ures gyorsitotare, es egy
 * rossz helyre nezo figyelo (masik munkakonyvtar, standalone kep) orokre
 * nullat merne riasztas nelkul. Ilyenkor `null` jon vissza.
 */
export async function cacheMeretMeres(
  beallitas: CacheMeretBeallitas,
  naplo: (sor: string) => void = (sor) => console.warn(sor),
): Promise<number | null> {
  if (!(await konyvtarLetezik(beallitas.konyvtar))) {
    naplo(
      `CACHE-MERET-NINCS-KONYVTAR ${JSON.stringify({
        konyvtar: beallitas.konyvtar,
      })}`,
    )
    return null
  }
  const mb =
    Math.round(((await konyvtarMeret(beallitas.konyvtar)) / 1024 / 1024) * 10) /
    10
  if (mb > beallitas.hatarMb)
    naplo(
      `CACHE-MERET-RIASZTAS ${JSON.stringify({
        mb,
        hatarMb: beallitas.hatarMb,
        konyvtar: beallitas.konyvtar,
      })}`,
    )
  return mb
}

/**
 * Az idozito: indulaskor egy meres (a meret egy sorban akkor is latszik, ha a
 * hatar alatt van), utana `intervallumMs`-enkent. Az idozito nem tartja eletben
 * a folyamatot (`unref`).
 */
export function cacheMeretFigyelo(
  beallitas = cacheMeretBeallitas(),
  naplo: (sor: string) => void = (sor) => console.warn(sor),
): NodeJS.Timeout {
  const meres = () =>
    cacheMeretMeres(beallitas, naplo).catch(() => {
      // a figyelo hibaja nem allithatja meg a kirakatot
    })
  void cacheMeretMeres(beallitas, naplo)
    .then((mb) => {
      // hianyzo konyvtarnal a megnevezett sor mar kiment
      if (mb !== null)
        console.log(
          `cache-meret: ${mb} MB (${beallitas.konyvtar}), hatar ${beallitas.hatarMb} MB`,
        )
    })
    .catch(() => undefined)
  const idozito = setInterval(meres, beallitas.intervallumMs)
  idozito.unref()
  return idozito
}
