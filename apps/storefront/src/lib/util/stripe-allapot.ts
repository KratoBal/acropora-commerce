/**
 * A STRIPE-FIZETES ALLAPOTA A FIZETESI LEPESBEN (a keretek 477:*), egy helyen:
 * a gomb ebbol irja a feliratat, a panel ebbol dont, mit mutat.
 *
 *   alap         "Rendelés leadása"
 *   feldolgozas  "Feldolgozás…", a mezo zarolva, "Fizetés feldolgozása…"
 *   elutasitva   "Próbáld újra", a rogzitett hibamondat
 *   ellenorzes   "Ellenőrzés…", a 3DS utani visszaterites alatt
 */
export type StripeAllapot = "alap" | "feldolgozas" | "elutasitva" | "ellenorzes"

/** A prompt 9. pontja szerint, szo szerint. */
export const ELUTASITOTT_KARTYA =
  "A kártyás fizetés nem sikerült. Próbáld újra vagy válassz másik fizetési módot."

export const stripeGombFelirat = (allapot: StripeAllapot): string =>
  allapot === "feldolgozas"
    ? "Feldolgozás…"
    : allapot === "ellenorzes"
      ? "Ellenőrzés…"
      : allapot === "elutasitva"
        ? "Próbáld újra"
        : "Rendelés leadása"

/**
 * A HIBA FAJTAJA DONTI EL, MI LATSZIK:
 *   validation_error  a Stripe a mezoben maga jelzi (a prompt 7. pontja), mi
 *                     nem irjuk ki meg egyszer;
 *   card_error        a bank elutasitotta: a rogzitett mondat es "Próbáld újra";
 *   barmi mas         a Stripe uzenete, ahogy eddig.
 */
export const stripeHibaFajta = (
  hiba: { type?: string } | undefined,
): "validacio" | "elutasitas" | "egyeb" =>
  hiba?.type === "validation_error"
    ? "validacio"
    : hiba?.type === "card_error"
      ? "elutasitas"
      : "egyeb"
