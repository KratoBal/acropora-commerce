/**
 * A FEJLEC MENUJENEK SORRENDJE (2026-09-29).
 *
 * Balazs dontese, 2026-09-09 09:54 (Commerce frontend szal), szo szerint:
 * "MIndenhol: Termékek, Halak, Korallok, Gerinctelenek".
 *
 * A menupontok tovabbra is ADATBOL jonnek (a nem ures gyoker-kategoriak); ez a
 * fuggveny csak SORBA RENDEZI oket. A negy gyokeret a handle-juk azonositja,
 * nem a nevuk, es ekezettol, kis- es nagybetutol fuggetlenul: a stage-en a
 * Termékek handle-je ekezetes (`termékek`), egy mas kornyezetben lehet ekezet
 * nelkuli is.
 *
 * Egy ISMERETLEN uj gyoker nem esik ki, hanem a vegere kerul, a kapott
 * sorrendjeben. Egy hianyzo gyoker egyszeruen nem jelenik meg.
 */
export const FEJLEC_GYOKER_SORREND = [
  "termekek",
  "halak",
  "korallok",
  "gerinctelenek",
] as const

const kulcs = (handle: string | null | undefined) =>
  (handle ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

export function fejlecSorrend<T extends { handle?: string | null }>(
  gyokerek: readonly T[],
): T[] {
  const helye = (gyoker: T) => {
    const index = (FEJLEC_GYOKER_SORREND as readonly string[]).indexOf(
      kulcs(gyoker.handle),
    )
    return index === -1 ? FEJLEC_GYOKER_SORREND.length : index
  }
  return gyokerek
    .map((gyoker, eredeti) => ({ gyoker, eredeti }))
    .sort((a, b) => helye(a.gyoker) - helye(b.gyoker) || a.eredeti - b.eredeti)
    .map(({ gyoker }) => gyoker)
}
