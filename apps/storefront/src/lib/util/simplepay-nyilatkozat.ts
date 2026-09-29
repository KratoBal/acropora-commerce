/**
 * A SIMPLEPAY ADATTOVABBITASI NYILATKOZATA (P4-4).
 *
 * A szoveg a SimplePay sajat mintaja (API v2 leiras, 8. fejezet, L3036-3046),
 * a kiemelt helyeken a szerzodes szerinti adatokkal. Balazs dontese
 * 2026-09-29 21:05 UTC (emlek 1936): szekhely 1106 Budapest, Pesti Gabor
 * utca 35., webcim shop.acropora.hu. A tovabbitott adatok kore az, amit a
 * hatter tenylegesen kuld (nev, e-mail, szamlazasi cim, telefon: a SimplePay
 * provider `customerEmail` es `invoice` mezoi).
 *
 * A vevonek KIFEJEZETTEN el kell fogadnia, mielott a tranzakcio elindul
 * (L3017-3027); a weboldalon elhelyezett szoveg onmagaban nem eleg.
 */
export const SIMPLEPAY_NYILATKOZAT =
  "Tudomásul veszem, hogy az Acropora Kft. (1106 Budapest, Pesti Gábor utca 35.) adatkezelő által a shop.acropora.hu felhasználói adatbázisában tárolt alábbi személyes adataim átadásra kerülnek a SimplePay Zrt., mint adatfeldolgozó részére. Az adatkezelő által továbbított adatok köre az alábbi: név, e-mail cím, számlázási cím, telefonszám. Az adatfeldolgozó által végzett adatfeldolgozási tevékenység jellege és célja a SimplePay Adatkezelési tájékoztatóban, az alábbi linken tekinthető meg:"

export const SIMPLEPAY_ADATKEZELESI_TAJEKOZTATO =
  "https://simplepay.hu/adatkezelesi-tajekoztatok/"

/**
 * A logo linkje a Fizetesi Tajekoztatora mutat (7. fejezet, L2997-3004): a
 * logonak egyben linknek is kell lennie.
 */
export const SIMPLEPAY_FIZETESI_TAJEKOZTATO =
  "https://simplepartner.hu/PaymentService/Fizetesi_tajekoztato.pdf"

/** A SimplePay-bol letoltott logo (kartyalogokkal), a kirakat sajat eleresi utjan. */
export const SIMPLEPAY_LOGO = "/simplepay/simplepay-kartyak.png"
