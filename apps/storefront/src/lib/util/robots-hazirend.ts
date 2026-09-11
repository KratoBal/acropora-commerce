/**
 * A ROBOTS HAZIREND A HOSZTNEVBOL DOL EL, NEM KORNYEZETI VALTOZOBOL.
 *
 * Ugyanaz a kirakat-kod szolgalja ki a tesztet es az elest, tehat a hazirend nem
 * lehet beegetett. Ket lehetoseg volt, es acrobot dontese (2026-09-10) a hosztnev:
 *
 *   kornyezeti valtozo   el kell hozza jutni MINDEN kornyezetben, es a HIANYA nema:
 *                        egy uj kornyezet, ahol elfelejtik beallitani, csendben a
 *                        rossz oldalra esik
 *   hosztnev             a keresnel MINDIG ott van, nem lehet elfelejteni, es a lap
 *                        maga megmutatja, mit dontott
 *
 * A SZABALY: nev szerinti lista az ELES hosztokrol. Ami rajta van, `allow`;
 * MINDEN MAS `Disallow: /`.
 *
 * === AZ IRANY VALASZTASANAK INDOKA, ES HOGY MIERT NEM FORDITVA ===
 *
 * A ket hiba ara nem egyforma:
 *
 *   a teszt bolt indexelodik   a vevo rossz boltot talal -- kellemetlen, VISSZAFORDITHATO
 *   az eles bolt kitiltodik    a bolt eltunik a keresobol, es a visszaterese HETEK
 *
 * Elsore tehat az "alapertelmezes allow" latszik biztonsagosabbnak. AZERT NEM AZ:
 * az eles Medusa kirakat MA MEG NEM EL (a bolt az UNAS-on all), tehat ma nincs mit
 * elveszteni, es a rossz irany azonnal lathato lenne. Egy nev szerinti lista plusz
 * teszt olcsobb vedelem, mint egy alapertelmezes, ami a SULYOSABB hibat teszi nemava.
 *
 * === A LISTA TARTALMA MERT, NEM TALALT ===
 *
 * `infra/.env.template:23-25` szo szerint: a teszt hoszt `shop-staging.acropora.hu`,
 * es "a kirakat eles neve egyszer shop.acropora.hu lesz".
 *
 * ES EGY HATAR, AMIT KI KELL MONDANI: a `shop.acropora.hu` MA AZ UNAS BOLTOT
 * szolgalja ki, nem ezt a kirakatot (`footer/hivatkozasok.ts` fejlece: "Ma a
 * shop.acropora.hu A VALODI BOLT: ott vasarolnak"). A bejegyzes tehat MA NULLA
 * lapot erint -- akkor lep eletbe, amikor a kirakat tenylegesen odakerul.
 *
 * AMI EBBOL NEM AZ EN DONTESEM: hogy az ELES hazirend tartalma pontosan mi legyen
 * (mely utak tiltottak, van-e sitemap-hivatkozas). Az kimeno, kulso dontes, Balazs
 * ele valo. Az itt allo `allow` a SZERKEZETET adja meg, nem a vegleges tartalmat --
 * es a koltozes pillanata az, amikor ezt vegig kell kerdezni.
 */
export const ELES_HOSZTOK = ["shop.acropora.hu"] as const

export type RobotsHazirend = {
  /** `true` -> indexelheto; `false` -> teljes tiltas. */
  engedett: boolean
  hoszt: string | null
}

/**
 * A HOSZTNEV A KERES FEJLECEBOL JON, ES LEHET PORT IS BENNE (`localhost:8000`),
 * illetve nagybetus alak. Mind a kettot normalizaljuk, mert a lista nev szerinti:
 * egy `SHOP.ACROPORA.HU` alak kulonben csendben a tilto agra esne.
 */
export function robotsHazirend(hosztFejlec: string | null): RobotsHazirend {
  const hoszt = (hosztFejlec ?? "").trim().toLowerCase().split(":")[0] || null

  return {
    engedett:
      hoszt !== null && (ELES_HOSZTOK as readonly string[]).includes(hoszt),
    hoszt,
  }
}
