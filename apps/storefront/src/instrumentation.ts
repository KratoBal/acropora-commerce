/**
 * A KIRAKAT INDULASKORI HOROGJA (Next `register`). Ma egy dolgot indit: a
 * `.next/cache` meretfigyeleset (FE-7, `lib/szerver/cache-meret`). Csak a
 * Node futtatokornyezetben, es csak a futo szerveren: a build kozben nem.
 *
 * Az import a `NEXT_RUNTIME === "nodejs"` feltetel BELSEJEBEN all, ebben a
 * dokumentalt alakban: a Next ezt az agat az edge-forditasbol kivagja. Egy
 * korai `return` mellett a `node:fs` import az edge-forditasba is bekerult, es
 * a build elbukott (merve 2026-10-07: UnhandledSchemeError, node:fs/promises).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    if (process.env.NEXT_PHASE === "phase-production-build") return
    const { cacheMeretFigyelo } = await import("@lib/szerver/cache-meret")
    cacheMeretFigyelo()
  }
}
