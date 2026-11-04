import { hajtogat } from "./ekezet-hajtogatas";
import { FAJ_CSOPORTOK } from "./faj-szinonimak";

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

/**
 * Minden csoport: a szakszavak (korall kereso-szinonimak.md) es a fajnevek (korall
 * fajnev-lista.csv, `faj-szinonimak.ts`). Egy kulcs csak egy csoportban allhat (teszt meri).
 */
export const OSSZES_CSOPORT: readonly (readonly string[])[] = [
  ...SZINONIMA_CSOPORTOK,
  ...FAJ_CSOPORTOK,
];

const CSOPORT_INDEX: ReadonlyMap<string, number> = new Map(
  OSSZES_CSOPORT.flatMap((csoport, i) =>
    csoport.map((tag) => [kulcs(tag), i] as const),
  ),
);

/** A leghosszabb tobb szavas tag szoszama: eddig nezunk elore a kerdesben. */
const LEGHOSSZABB_TAG = Math.max(
  ...OSSZES_CSOPORT.flat().map((tag) => tag.split(/\s+/).length),
);

/** Az egyszavas tagok kulcsa es csoportja: a toldalekos alak felismeresehez. */
const EGYSZAVAS_TAGOK: ReadonlyArray<readonly [string, number]> =
  OSSZES_CSOPORT.flatMap((csoport, i) =>
    csoport
      .filter((tag) => !/\s/.test(tag.trim()))
      .map((tag) => [kulcs(tag), i] as const),
  );

/**
 * A TOLDALEKOS ALAK IS A CSOPORTJAT KAPJA (V4.1, 2. szelet; merve a #650 utan: a
 * "lehabzók" 64-et adott a "lehabzó" 70-e helyett, mert csak a tovet kereste). Ha a
 * szobol toldalek esik le, es a to (legalabb ot betu) pontosan EGY csoport egyszavas
 * tagja, vagy a tag legfeljebb egy betuvel hosszabb nala (lehabz -> lehabzo), a szo azt a
 * csoportot kapja. Hosszabb tag-elejre nem: a "korallok" ne egy korall-fajnevet kapjon.
 * Ket csoportnal nem dontunk: akkor a to marad.
 */
function toldalekosCsoport(szo: string): number | undefined {
  const k = kulcs(szo);
  const to = toalak(k);
  if (to === k || to.length < MIN_TO) return undefined;
  const csoportok = new Set(
    EGYSZAVAS_TAGOK.filter(
      ([tag]) => tag.startsWith(to) && tag.length - to.length <= 1,
    ).map(([, i]) => i),
  );
  return csoportok.size === 1 ? [...csoportok][0] : undefined;
}

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

/**
 * VEDETT SZAVAK: a vegyszernevek -at/-et vege a szo resze, nem targyrag (barracuda,
 * #650): a "szilikát" tove nem "szili" (az a szilikonra is illeszkedne), a
 * "karbonát"-e nem "karbon" (az aktiv szen). Ha a szo ezek egyike, vagy egyike es
 * mogotte egy ismert toldalek, a vedett szo marad (szilikátot -> szilikat); egy
 * osszetett szo (karbonátkeménység) nem vedett.
 */
export const VEDETT_SZAVAK: readonly string[] = [
  "nitrat",
  "foszfat",
  "szilikat",
  "karbonat",
  "szulfat",
];

export function toalak(szo: string): string {
  // csak a szo maga, vagy mogotte egy ismert toldalek: a "karbonátkeménység" nem vedett szo
  const vedett = VEDETT_SZAVAK.find(
    (v) =>
      szo === v ||
      (szo.startsWith(v) && TOLDALEKOK.includes(szo.slice(v.length))),
  );
  if (vedett) return vedett;
  for (const toldalek of TOLDALEKOK)
    if (szo.endsWith(toldalek) && szo.length - toldalek.length >= MIN_TO)
      return szo.slice(0, -toldalek.length);
  return szo;
}

/** Egy tag illesztesei: rovidites szohatarral, kulonben a tag es irasmodjai reszszovegkent. */
function tagIllesztesei(tag: string): Illesztes[] {
  const hajtogatott = hajtogat(tag);
  // A rovid egyszavas tag (Nemo, RODI) is szohatarral megy: reszszovegkent az
  // "anemóna" a "nemo"-t, tehat a bohochal-csoport minden anemonat hozna.
  if (
    ROVIDITESEK.has(hajtogatott) ||
    (hajtogatott.length < MIN_TO && !/\s/.test(hajtogatott))
  )
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
/**
 * A FELSO HATAR (barracuda, #650): a kereses nyilvanos es hitelesites nelkuli, es
 * egy csoport-szo a csoport minden tagjat viszi mind a negy oszlopra. Egy hosszu
 * `q` (ugyanaz a rovid szo az URL hosszaig) sok ezer OR-olt feltetelt es a
 * bind-parameterek hataranak kozeleben allo lekerdezest adna, egyetlen keresbol.
 * A kirakat keresoje nyolc szonal tobbet ertelmesen nem kap; a tobbi elmarad.
 */
export const MAX_SZO = 8;

export function keresesiTerv(kifejezes: string): Feltetel[] {
  const szavak = kifejezes
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, MAX_SZO);
  const feltetelek: Feltetel[] = [];
  // az azonos feltetel (ugyanaz a csoport vagy ugyanaz a to ketszer) egyszer kerul be
  const latott = new Set<string>();
  const felvesz = (feltetel: Feltetel) => {
    const k = JSON.stringify(feltetel);
    if (latott.has(k)) return;
    latott.add(k);
    feltetelek.push(feltetel);
  };
  for (let i = 0; i < szavak.length;) {
    let talalt = false;
    for (let n = Math.min(LEGHOSSZABB_TAG, szavak.length - i); n >= 1; n -= 1) {
      const csoport = CSOPORT_INDEX.get(
        kulcs(szavak.slice(i, i + n).join(" ")),
      );
      if (csoport === undefined) continue;
      felvesz(egyedi(OSSZES_CSOPORT[csoport]!.flatMap(tagIllesztesei)));
      i += n;
      talalt = true;
      break;
    }
    if (talalt) continue;
    const toldalekos = toldalekosCsoport(szavak[i]!);
    if (toldalekos !== undefined) {
      felvesz(egyedi(OSSZES_CSOPORT[toldalekos]!.flatMap(tagIllesztesei)));
      i += 1;
      continue;
    }
    const szo = hajtogat(szavak[i]!);
    felvesz([{ fajta: "resz", ertek: toalak(szo) }]);
    i += 1;
  }
  return feltetelek;
}

/** Egy rovidites Postgres-regexe: szohatar elotte es utana, a specialis jelek kiveve. */
export function szoMinta(ertek: string): string {
  return `\\m${ertek.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\M`;
}
