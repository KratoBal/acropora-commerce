/**
 * A KERESES TALALATAIBOL A LEKERDEZES `id` SZUROJE.
 *
 * === MIERT SAJAT FUGGVENY, ES MIERT NEM A LAPON BELUL ===
 *
 * A dontes elobb a `paginated-products.tsx` torzseben allt, es a spec a FORRAS
 * SZOVEGERE mert. A kalibracio megmutatta, hogy ez KEVES: a nulla-talalat
 * feltetelet `=== 0`-rol `=== -1`-re rontva a szeletek ZOLDEK maradtak, mert a
 * valtozo es a korai visszateres a helyen maradt -- az allitas a JELENLETET
 * merte, nem a FELTETELT.
 *
 * Itt viselkedest lehet merni, es a rontas nev szerint pirosodik.
 *
 * === A KET AG, ES AMIERT A MASODIK A VESZELYESEBB ===
 *
 *   nulla talalat            a lekerdezes EL SEM INDUL
 *   van talalat, de a meglevo `id` szurovel a METSZET ures   ugyanaz
 *
 * Egy URES `id` halmazt a lekerdezes figyelmen kivul hagyhatna, es akkor a vevo
 * a TELJES katalogust latna egy olyan keresesre, aminek nincs talalata. Nem
 * hibazna, es hihető valasznak latszana -- a nema fajta.
 */
export type KeresesSzuro =
  { nullaTalalat: true } | { nullaTalalat: false; ids: string[] }

export function keresesSzuro(
  talalatIds: readonly string[],
  /** A mar meglevo `id` szuro, ha van (kapcsolodo termekek listaja). */
  meglevoIds?: readonly string[],
): KeresesSzuro {
  /*
    KORAI VISSZATERES, ES A KALIBRACIO SZERINT NEM O DONT. Ezt a sort `=== -1`-re
    rontva EGYETLEN allitas sem pirosodott ki: az ures lista a metszeten at is
    ures marad, tehat a lenti zaro dontes ugyanugy elkapja. Vagyis a viselkedes
    NEM fugg tole -- olvashatosagot ad, nem vedelmet.

    Azert marad, mert a szandekot mondja ki (nulla talalat = nincs lekerdezes),
    es azert all itt ez a megjegyzes, hogy a kovetkezo olvaso ne higgye
    teherviselonek. A VALODI dontes a fuggveny utolso sora.
  */
  if (talalatIds.length === 0) return { nullaTalalat: true }

  // A KETTO METSZETE, NEM FELULIRAS: mind a ket feltetelnek teljesulnie kell.
  const ids = meglevoIds
    ? talalatIds.filter((id) => meglevoIds.includes(id))
    : [...talalatIds]

  return ids.length === 0
    ? { nullaTalalat: true }
    : { nullaTalalat: false, ids }
}
