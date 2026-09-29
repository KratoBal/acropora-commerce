/**
 * A SIMPLEPAY VISSZATERES SZOVEGEI (P4-4), a leiras 3.13 fejezete szerint.
 *
 * - Megszakitott fizetes es idotullepes: NEM tortent fizetes, tehat nem szabad
 *   sikertelen fizetesrol beszelni, es a tranzakcio-azonositot sem szabad
 *   kiirni (3.13.1, 3.13.2).
 * - Sikertelen fizetes: a tranzakcio-azonosito ES egy mondat, ami a vevot a
 *   megoldas fele viszi; az elutasitas okat kiirni TILOS (3.13.3).
 * - Sikeres fizetes: eleg a tranzakcio-azonosito (3.13.4).
 *
 * A mintaszovegek magazoak; a bolt tegezve beszel, ezert tegezo alakban,
 * ugyanazzal a tartalommal. A dontest a HATTER valasza hozza (a tranzakcio
 * lekerdezese), nem a visszateres esemenye: az esemeny nem bizonyitek.
 */
export type SimplePayVisszateresValasz = {
  event?: string
  status?: "paid" | "not_paid" | "pending"
  order_ids?: string[]
}

export type SimplePayEredmeny = {
  cim: string
  sorok: string[]
  /** Csak sikeres es sikertelen fizetesnel (3.13.3, 3.13.4). */
  tranzakcio: string | null
  /** A kiszallitott (elso) rendeles, ha mar letrejott. */
  rendelesId: string | null
  /** A kosar megmaradt, a fizetes ujra elindithato. */
  vissza: boolean
}

export const SIMPLEPAY_SIKERES = "Sikeres tranzakció."
export const SIMPLEPAY_SIKERTELEN = "Sikertelen tranzakció."
export const SIMPLEPAY_MEGSZAKITVA = "Megszakítottad a fizetést."
export const SIMPLEPAY_IDOTULLEPES =
  "Túllépted a fizetés elindítására rendelkezésre álló időt."
export const SIMPLEPAY_SIKERTELEN_TEENDO =
  "Ellenőrizd, hogy a fizetés során helyesen adtad-e meg az adatokat. Ha minden adatot helyesen adtál meg, a visszautasítás okának kivizsgálásához vedd fel a kapcsolatot a kártyádat kibocsátó bankkal."
export const SIMPLEPAY_KOSAR_MEGMARADT =
  "A kosarad megmaradt, a fizetést újra elindíthatod."
export const SIMPLEPAY_RENDELES_FOLYAMATBAN =
  "A rendelésed rögzítése folyamatban van, néhány perc múlva megtalálod a fiókodban."
export const SIMPLEPAY_FUGGOBEN =
  "A fizetés eredménye még nem végleges. Néhány perc múlva nézd meg a rendeléseid között, hogy megérkezett-e, mielőtt újra fizetnél."
export const SIMPLEPAY_NEM_ELLENORIZHETO =
  "A fizetés eredményét most nem tudtuk ellenőrizni. Mielőtt újra fizetnél, nézd meg a rendeléseid között, hogy megérkezett-e."

export const tranzakcioSor = (t: string) =>
  `SimplePay tranzakcióazonosító: ${t}`

export function simplePayEredmeny(
  valasz: SimplePayVisszateresValasz | null,
  tranzakcio: string | null,
): SimplePayEredmeny {
  if (!valasz) {
    return {
      cim: "A fizetés eredménye",
      sorok: [SIMPLEPAY_NEM_ELLENORIZHETO],
      tranzakcio: null,
      rendelesId: null,
      vissza: false,
    }
  }

  if (valasz.status === "paid") {
    const rendelesId = valasz.order_ids?.[0] ?? null
    return {
      cim: SIMPLEPAY_SIKERES,
      sorok: rendelesId ? [] : [SIMPLEPAY_RENDELES_FOLYAMATBAN],
      tranzakcio,
      rendelesId,
      vissza: false,
    }
  }

  if (valasz.status === "not_paid") {
    if (valasz.event === "CANCEL") {
      return {
        cim: SIMPLEPAY_MEGSZAKITVA,
        sorok: [SIMPLEPAY_KOSAR_MEGMARADT],
        tranzakcio: null,
        rendelesId: null,
        vissza: true,
      }
    }
    if (valasz.event === "TIMEOUT") {
      return {
        cim: SIMPLEPAY_IDOTULLEPES,
        sorok: [SIMPLEPAY_KOSAR_MEGMARADT],
        tranzakcio: null,
        rendelesId: null,
        vissza: true,
      }
    }
    return {
      cim: SIMPLEPAY_SIKERTELEN,
      sorok: [SIMPLEPAY_SIKERTELEN_TEENDO, SIMPLEPAY_KOSAR_MEGMARADT],
      tranzakcio,
      rendelesId: null,
      vissza: true,
    }
  }

  return {
    cim: "A fizetés eredménye",
    sorok: [SIMPLEPAY_FUGGOBEN],
    tranzakcio: null,
    rendelesId: null,
    vissza: false,
  }
}

/**
 * A tranzakcio-azonosito a visszateres `r` mezojebol (base64 JSON, `t`). Csak
 * akkor irjuk ki, ha a hatter az alairast elfogadta: a lap a hatter
 * valaszaval egyutt hasznalja.
 */
export const tranzakcioAzR = (r: string | null | undefined): string | null => {
  if (!r) return null
  try {
    const t = (
      JSON.parse(Buffer.from(r, "base64").toString("utf8")) as { t?: unknown }
    ).t
    return typeof t === "number" || (typeof t === "string" && /^\d+$/.test(t))
      ? String(t)
      : null
  } catch {
    return null
  }
}
