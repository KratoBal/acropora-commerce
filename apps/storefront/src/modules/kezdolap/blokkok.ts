/**
 * A KEZDOLAP FIX BLOKKJAI ES A SORRENDJUK. A kulcsok az OS-szel kozosek
 * (nautilus 36013/36016, a bolt validatora is ezeket ismeri); a felsorolas
 * sorrendje a Claude Design terv szerinti alapertelmezett sorrend.
 */
export const BLOKK_KULCSOK = [
  "hero",
  "mit-keresel",
  "kezdo-es-halado",
  "egyedi-korallok",
  "szolgaltatasok",
  "markak",
  "velemenyek",
  "boltunk",
] as const

export type BlokkKulcs = (typeof BLOKK_KULCSOK)[number]

const ISMERT = new Set<string>(BLOKK_KULCSOK)

/**
 * A MEGJELENO BLOKKOK SORRENDBEN. `null` vagy hiany: a lap sorrendje, minden
 * latszik. A lista CSAK AKKOR ervenyes, ha pontosan a nyolc fix blokkot tartja,
 * mindegyiket egyszer, logikai `visible`-lel: a bolt validatora ezt amugy is
 * megkoveteli, de a lap nem bizik benne. Egy sertett lista NEM rejt el semmit
 * es nem rendez at fel-ertelmezve: a lap sorrendjere esik vissza (egy hianyzo
 * blokk jelentese, "rejtett" vagy "elfelejtett", kivulrol nem olvashato).
 */
export function megjeleno(blocks: unknown): BlokkKulcs[] {
  if (!Array.isArray(blocks)) return [...BLOKK_KULCSOK]
  const kulcsok = new Set<string>()
  for (const elem of blocks) {
    if (
      !elem ||
      typeof elem !== "object" ||
      typeof (elem as { key?: unknown }).key !== "string" ||
      typeof (elem as { visible?: unknown }).visible !== "boolean" ||
      !ISMERT.has((elem as { key: string }).key)
    )
      return [...BLOKK_KULCSOK]
    kulcsok.add((elem as { key: string }).key)
  }
  if (
    blocks.length !== BLOKK_KULCSOK.length ||
    kulcsok.size !== BLOKK_KULCSOK.length
  )
    return [...BLOKK_KULCSOK]
  return (blocks as Array<{ key: BlokkKulcs; visible: boolean }>)
    .filter((elem) => elem.visible)
    .map((elem) => elem.key)
}
