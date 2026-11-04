import { hajtogat } from "./ekezet-hajtogatas";

/**
 * A KERESES TERVE: SZINONIMAK, ROVIDITESEK, TOALAK (V4.1, kartya f59d7d12).
 *
 * A route ezt a TISZTA tervet forditja SQL-re; itt nincs adatbazis, tehat minden
 * dontes unit-tesztelheto.
 *
 * === MIT MERTUNK ELOTTE (teszt Medusa, 2026-11-04, a mai kod) ===
 *
 *   fehérjelefölöző 0, fehérje lefölöző 0, lefölöző 0   (a lehabzó 62)
 *   automata utántöltő 0, calcium reactor 0, ICP-teszt 0
 *   KH 200+, ATO 200+, Ca 200+                          (szo belsejeben is talal)
 *   lehabzók 5                                          (a lehabzó 62)
 *
 * === A HAROM SZABALY ===
 *
 * 1. SZINONIMA-CSOPORT (korall listaja, exchange/otletek-2026-11-04/
 *    kereso-szinonimak.md): ha a kerdes egy szava vagy szokapcsolata egy csoport
 *    tagja, a feltetel a csoport BARMELYIK tagjara teljesul. A tobb szavas tag
 *    (fehérje lefölöző) a kerdesben is felismerheto, kotojellel, perjellel,
 *    szokozzel vagy egybeirva.
 * 2. ROVIDITES (KH, ATO, Ca, Mg, NO3, PO4, RO/DI): szohatarral illeszkedik, nem
 *    szo belsejeben.
 * 3. TOALAK: a gyakori magyar toldalekot levagjuk (lehabzók -> lehabz), de csak
 *    ha legalabb OT betus to marad; a reszszoveg-illesztes a tobbit elvegzi.
 *
 * AMI SZANDEKOSAN NINCS BENNE: a "fény" (korall szerint csak a vilagitas
 * kategoriajara szukitve ertelmes), a "szivattyú/pumpa" az aramoltatoval (nem
 * szinonima), es a talalatok RANGSORA (a route ma letrehozas szerint rendez; a
 * "pumpa" keresesnel az adagolopumpak elore hozasa kulon kerdes).
 */

export type Illesztes =
  /** a hajtogatott oszlop reszszovegkent tartalmazza */
  | { fajta: "resz"; ertek: string }
  /** a hajtogatott oszlopban kulon szokent all (Postgres `\m...\M`) */
  | { fajta: "szo"; ertek: string };

/** Egy feltetel: a felsorolt illesztesek KOZUL legalabb egy teljesul. A feltetelek kozott ES van. */
export type Feltetel = Illesztes[];

export const SZINONIMA_CSOPORTOK: readonly (readonly string[])[] = [
  [
    "lehabzó",
    "skimmer",
    "protein skimmer",
    "fehérje lefölöző",
    "lefölöző",
    "fehérjeleválasztó",
  ],
  ["áramoltató", "wavemaker", "áramlásgenerátor"],
  ["KH", "karbonátkeménység", "alkalinitás", "lúgosság"],
  ["ATO", "automata utántöltő", "utántöltő", "vízszint-utántöltő"],
  ["refraktométer", "sótartalom-mérő", "szalinitásmérő", "sűrűségmérő"],
  [
    "RO/DI",
    "RODI",
    "ozmózis",
    "ozmózisvíz",
    "fordított ozmózis",
    "ioncserélő gyanta",
  ],
  ["adagolópumpa", "adagoló pumpa", "dózispumpa", "dosing pump"],
  ["kalciumreaktor", "kalcium reaktor", "calcium reactor"],
  ["világítás", "lámpa", "LED lámpa"],
  ["Ca", "kalcium"],
  ["Mg", "magnézium"],
  ["NO3", "nitrát"],
  ["PO4", "foszfát"],
  ["ICP-teszt", "ICP vízelemzés", "vízanalízis", "vízelemzés"],
  ["akklimatizáció", "akklimatizálás"],
];

/** Szohatarral illesztendo rovidites: ezek reszszovegkent szo belsejeben is talalnanak. */
export const ROVIDITESEK: ReadonlySet<string> = new Set(
  ["KH", "ATO", "Ca", "Mg", "NO3", "PO4", "RO/DI"].map(hajtogat),
);

/** A csoport-kereses kulcsa: hajtogatva, kotojel, perjel es szokoz nelkul. */
export function kulcs(szoveg: string): string {
  return hajtogat(szoveg).replace(/[\s\-/]+/g, "");
}

const CSOPORT_INDEX: ReadonlyMap<string, number> = new Map(
  SZINONIMA_CSOPORTOK.flatMap((csoport, i) =>
    csoport.map((tag) => [kulcs(tag), i] as const),
  ),
);

/** A leghosszabb tobb szavas tag szoszama: eddig nezunk elore a kerdesben. */
const LEGHOSSZABB_TAG = Math.max(
  ...SZINONIMA_CSOPORTOK.flat().map((tag) => tag.split(/\s+/).length),
);

/**
 * A levaghato toldalekok, a hosszabb elol. Csak hajtogatott alakra (lehabzók ->
 * lehabzok), es csak ha legalabb `MIN_TO` betu marad: a rovid szo (nitrát,
 * teszt) egeszben megy.
 */
const TOLDALEKOK = [
  "okat",
  "eket",
  "akat",
  "kat",
  "ket",
  "ok",
  "ek",
  "ak",
  "ot",
  "et",
  "at",
  "k",
  "t",
];
const MIN_TO = 5;

export function toalak(szo: string): string {
  for (const toldalek of TOLDALEKOK)
    if (szo.endsWith(toldalek) && szo.length - toldalek.length >= MIN_TO)
      return szo.slice(0, -toldalek.length);
  return szo;
}

/** Egy tag illesztesei: rovidites szohatarral, kulonben a tag es irasmodjai reszszovegkent. */
function tagIllesztesei(tag: string): Illesztes[] {
  const hajtogatott = hajtogat(tag);
  if (ROVIDITESEK.has(hajtogatott))
    return [{ fajta: "szo", ertek: hajtogatott }];
  const alakok = new Set([
    hajtogatott,
    hajtogatott.replace(/[\-/]/g, " "),
    hajtogatott.replace(/[\s\-/]+/g, ""),
  ]);
  return [...alakok].map((ertek) => ({ fajta: "resz", ertek: toalak(ertek) }));
}

function egyedi(illesztesek: Illesztes[]): Illesztes[] {
  const latott = new Set<string>();
  return illesztesek.filter((i) => {
    const k = `${i.fajta}:${i.ertek}`;
    if (latott.has(k)) return false;
    latott.add(k);
    return true;
  });
}

/**
 * A kerdes feltetelekre bontva. Balrol jobbra halad; minden poziciora a
 * LEGHOSSZABB csoport-tagot keresi (a "fehérje lefölöző" ket szava egy
 * feltetel), es ha nincs, a szo maga lesz egy feltetel a toalakjaval.
 */
export function keresesiTerv(kifejezes: string): Feltetel[] {
  const szavak = kifejezes.trim().split(/\s+/).filter(Boolean);
  const feltetelek: Feltetel[] = [];
  for (let i = 0; i < szavak.length;) {
    let talalt = false;
    for (let n = Math.min(LEGHOSSZABB_TAG, szavak.length - i); n >= 1; n -= 1) {
      const csoport = CSOPORT_INDEX.get(
        kulcs(szavak.slice(i, i + n).join(" ")),
      );
      if (csoport === undefined) continue;
      feltetelek.push(
        egyedi(SZINONIMA_CSOPORTOK[csoport]!.flatMap(tagIllesztesei)),
      );
      i += n;
      talalt = true;
      break;
    }
    if (talalt) continue;
    const szo = hajtogat(szavak[i]!);
    feltetelek.push([{ fajta: "resz", ertek: toalak(szo) }]);
    i += 1;
  }
  return feltetelek;
}

/** Egy rovidites Postgres-regexe: szohatar elotte es utana, a specialis jelek kiveve. */
export function szoMinta(ertek: string): string {
  return `\\m${ertek.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\M`;
}
