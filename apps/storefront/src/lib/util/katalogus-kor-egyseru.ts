/**
 * A HALMAZ EGYSZERU (task t-20261116-gyoker-ar-rendezes), ha csak a kategoria (vagy a bolt mind) szur: nincs marka-, opcio-,
 * azonosito- vagy mas szuro. Csak ekkor azonos a rendezo kor halmaza a marka-szamlaloeval (az a kategoria osszes termeket
 * szamolja, a szurok nelkul), tehat csak ekkor oszthatnak meg egy kort.
 */
export function katalogusKorEgyseru(params: Record<string, unknown>): boolean {
  const megengedett = new Set(["limit", "fields", "category_id"])
  if (!Object.keys(params).every((kulcs) => megengedett.has(kulcs)))
    return false
  const kategoria = params.category_id
  return (
    kategoria === undefined ||
    (Array.isArray(kategoria) && kategoria.length === 1)
  )
}

/**
 * A MARKA-SZAMLALO OSZTHAT-E A KORT: ar szerinti rendezesnel, szuro nelkul (a lista maga is egyszeru halmaz). A ket hivo (a lista es
 * a marka-szamlalo) ugyanezt a dontest hozza, tehat ha nem egyezne, csak az oszto marad el, a helyesseg nem.
 */
export function korMegosztott(opciok: {
  sortBy?: string
  markak?: readonly string[]
  optionValueIds?: readonly string[]
  tartasIdk?: readonly string[] | null
}): boolean {
  return (
    (opciok.sortBy === "price_asc" || opciok.sortBy === "price_desc") &&
    (opciok.markak?.length ?? 0) === 0 &&
    (opciok.optionValueIds?.length ?? 0) === 0 &&
    !opciok.tartasIdk
  )
}
