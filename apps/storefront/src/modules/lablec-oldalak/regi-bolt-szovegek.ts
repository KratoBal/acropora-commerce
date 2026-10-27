/**
 * A REGI BOLT FIZETES ES SZALLITAS OLDALANAK SZOVEGE, SZO SZERINT
 * (commerce-audit-p1, lablec, acrobot 2026-10-27 19:26 UTC: "a regi bolt MAI
 * szovege atveve szo szerint ... uj szoveget nem irunk").
 *
 * FORRAS: a regi bolt `shop_contact.php` oldala (Szallitasi modok es Fizetesi
 * modok szakasz), a tarolt pillanatkep 2026-09-02-i allapota
 * (`exchange/bolti-statikus-lapok-2026-09-02/shop_contact.php_tab_shipping.html`
 * es `..._tab_payment.html`). A szoveget a HTML-bol programmal vettem ki, nem
 * gepeltem. A MAI BOLT ELTERHET A PILLANATKEPTOL; az ismert eltereseket (arak,
 * szolgaltatok) a PR leirasa listazza, a szoveget itt nem javitottam.
 *
 * AZ EGYETLEN ELTERES A SZO SZERINTI ATVETELTOL (acrobot 2026-10-27 19:57 UTC,
 * Balazs: "CSAK Stripe, a SimplePay kikerul", msg 1556600276499308556): a
 * "Kedvezményes SIMPLEPAY Bankkártyás fizetés (-2% kedvezmény)" sor es a hozza
 * tartozo "Vásárló tájékoztató" link NINCS itt, mert az uj bolt nem kinal
 * SimplePay-t es 2% kedvezmenyt: a sor a vevot felrevezetne. Minden mas a regi
 * oldal szovege. A tobbi tartalmi eltereshez (arak, kuszobok, nehez aru) lasd
 * `minta-allapot.ts`.
 *
 * NEM VETTEM ATT: a szallito- es fizetesi logok (azok a regi bolt hosztjara
 * mutatnak, amit az elesitesi kapu tilt). A tabla-fejlecek es a feliratok a
 * regi oldaleval egyeznek.
 */
export type Reszlet = string | { link: string; href: string }

export type Savos = {
  /** A megrendeles vegosszegenek also hatara, a regi oldal alakjaban ("0 Ft"). */
  tol: string
  /** A felso hatar; ures, ha nincs ("50 000 Ft-tol"). */
  ig: string
  /** A szallitasi koltseg ("3 500 Ft", "ingyenes"). */
  koltseg: string
}

export type SzallitasiMod = {
  nev: string
  /** A mod leirasa, ha a regi oldalon van; a link a regi oldal linkje. */
  leiras?: readonly Reszlet[]
  /** Egyetlen szallitasi koltseg, ha nincs savos tabla. */
  koltseg?: string
  /** Savos szallitasi koltseg a megrendeles vegosszege szerint. */
  savok?: readonly Savos[]
}

export type FizetesiMod = {
  nev: string
}

export const SZALLITASI_MODOK_CIM = "Szállítási módok"
export const FIZETESI_MODOK_CIM = "Fizetési módok"
export const SZALLITASI_KOLTSEG_FELIRAT = "Szállítási költség"
export const MEGRENDELES_VEGOSSZEG_FELIRAT = "Megrendelés végösszeg"

export const SZALLITASI_MODOK: readonly SzallitasiMod[] = [
  {
    nev: "Személyes átvétel az üzletünkben",
    koltseg: "0 Ft",
  },
  {
    nev: "GLS házhozszállítás",
    savok: [
      { tol: "0 Ft", ig: "49 999 Ft", koltseg: "3 500 Ft" },
      { tol: "50 000 Ft", ig: "", koltseg: "ingyenes" },
    ],
  },
  {
    nev: "Átvétel a GLS csomagponton",
    savok: [
      { tol: "0 Ft", ig: "49 999 Ft", koltseg: "3 500 Ft" },
      { tol: "50 000 Ft", ig: "", koltseg: "ingyenes" },
    ],
  },
  {
    nev: "Nehéz áru házhozszállítása GLS futárszolgálattal",
    leiras: ["20 kg feletti termékek esetében alkalmazott szállítási mód"],
    koltseg: "4 500 Ft",
  },
  {
    nev: "Nehéz áru GLS csomagpontra szállítása",
    leiras: ["20 kg feletti termékek esetében alkalmazott szállítási mód"],
    koltseg: "4 500 Ft",
  },
  {
    nev: "Foxpost csomagautomaták",
    leiras: [
      "A FOXPOST egy egyszerű, rugalmas, érintkezésmentes és környezettudatos csomagátvételi és -küldési mód. Ha megrendelésed bármely FOXPOST csomagautomata egyikébe kéred, nem kell egész nap a futárra várnod. Az országos, folyamatosan bővülő csomagautomata-hálózat automatái könnyen hozzáférhetőek az ország számos pontján, hol beltérben, hol kültéren, és reggeltől estig elérhetőek. Miután átadtuk a FOXPOST-nak a csomagot, ők 1 munkanap alatt kiszállítják az automatába, majd sms-ben küldenek egy értesítőt és egy egyedi kódot, mellyel 3 napig átveheted. Fontos: az automatáknál csak bankkártyával tudsz fizetni. Csomagodat 14 napon belül a webshop kondíciói szerint visszaküldheted. Ezt bármelyik FOXPOST automatánál egyszerűen megteheted az egyedi csomagátvételi kód újbóli megadásával. Az automaták listáját és további információt ",
      { link: "itt", href: "https://www.foxpost.hu/csomagautomatak" },
      " találsz.",
    ],
    savok: [
      { tol: "0 Ft", ig: "29 999 Ft", koltseg: "1 150 Ft" },
      { tol: "30 000 Ft", ig: "", koltseg: "ingyenes" },
    ],
  },
]

export const FIZETESI_MODOK: readonly FizetesiMod[] = [
  { nev: "Készpénzzel vagy bankkártyával üzletünkben" },
  { nev: "Fizetés a GLS futárnál bankkártyával vagy készpénzzel (+450 Ft.)" },
  { nev: "Fizetés utánvéttel a GLS Csomagponton (+450 Ft.)" },
  { nev: "Fizetés a Foxpost csomagautomatánál bankkártyával (+450 Ft.)" },
]
