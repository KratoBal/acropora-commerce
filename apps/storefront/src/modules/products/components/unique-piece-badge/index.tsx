import { UNIQUE_PIECE_PROMISE } from "../stock-state/availability"

/**
 * "1 DB · EGYEDI PÉLDÁNY" -- A WYSIWYG-ÍGÉRET, KIMONDVA.
 *
 * E nélkül a vevő nem tudja, hogy a fotó pontosan azt a példányt mutatja, amit
 * kap. Ez az élő állat lapjának a lényege, és csendben romlik el nélküle: a lap
 * ugyanúgy néz ki, csak az ígéret nem hangzik el.
 *
 * A jelvény a kép BAL FELSŐ sarkában áll (picasso rajza szerint), tehát a
 * befoglaló elemnek `relative`-nek kell lennie. A tervben ugyanez all,
 * abszolut poziciovall a kepen (top/left 18px) -- vagyis a jelveny
 * SZERKEZETILEG a kephez tartozik, nem a vasarlasi reszhez.
 *
 * === SZOGLETES, NEM PIRULA -- ES EZ MERES ===
 *
 * A `rounded-full` a starter szokasa volt, nem a terve. Nautilus a tervfajlbol
 * merte (2026-09-07): a teljes tervben HUSZONEGY `border-radius` all, ebbol 16
 * darab `50%` (valodi korok), 2 darab `8px`, 1 darab `6px` -- es a jelveny
 * EGYIKBEN SINCS BENNE. A tervbeli jelvenyen nincs lekerekites egyaltalan.
 *
 * (A "pirula stimmel a terv tizenhat korehez" ervet ez cafolja: az a tizenhat
 * MASHOL van, es a jelveny nem tartozik hozzajuk.)
 *
 * === A SZINEK A TERVBOL JONNEK (2026-09-08) ===
 *
 * A jelveny REZ hatteren all, SOTET szoveggel -- a tervbol merve, a 2a lapon:
 *
 *   hatter   oklch(0.62 0.13 45)   a sotet blokkban a `--terv-kiemel`
 *   szoveg   oklch(0.15 0.014 45)  a sotet blokkban a `--terv-kiemel-szoveg`
 *   sugar    0
 *
 * ES EZ SZEMRE MAS JELVENY, NEM ARNYALAT-IGAZITAS. Aki ranez es meglepodik,
 * itt lassa, hogy szandekos volt:
 *
 *   eddig   sotet pirula (`bg-neutral-900/85`), vilagos borostyan szoveggel
 *   mostol  REZ hatter, SOTET szoveggel
 *
 * MIERT MOST, ES MIERT NEM KORABBAN: a valtas 02:13-tol TARTASBAN allt, es a
 * tartas oka egy NYITOTT kerdes volt -- akkor meg ket rez-valtozo allt egymas
 * mellett, es nem volt eldontve, melyik a helyes. Ezt a #137 zarta le: egy
 * token van, es a sotet blokkban pontosan az a ket ertek all, amit a tervbeli
 * jelvenyen mertunk. A tartas OKA jart le, nem a velemeny valtozott.
 * (acrobot feloldasa, msg_id 14842.)
 *
 * A KET ERTEK EGYUTT MOZDUL VAGY SEHOGY: a sotet szoveg a REGI sotet hatteren
 * olvashatatlan lett volna -- ezert nem lehetett csak az egyiket atvinni.
 *
 * ES EGY MERES, AMI KORABBAN ITT ALLT, PONTOSITVA: a "mind az ot rez-hatteru
 * elem" levezetes egy szures elotti reszhalmazra vonatkozott. Szakaszonkent
 * ujramerve KILENC rez hatteru elem all lapon belul, es a rajtuk allo szoveg
 * MEGFORDUL a ket vilag kozott: a sotet (2a) lapon 0.15, a vilagoson FEHER. A
 * jelvenyre a sotet ertek all, mert a jelveny csak elo allat lapjan jelenik
 * meg.
 *
 * ES A "MELYIK REZ-TOKEN" KERDES AZOTA MEGSZUNT, NEM MEGOLDODOTT. Itt korabban
 * az allt, hogy ez ma nem eldontheto, mert ket rez-valtozo letezett, es a
 * `globals.css` kommentje az egyikrol mast sugallt, mint amit a sotet blokk
 * tett ra. A ket valtozo 2026-09-08-tol EGY: a sotet blokkban a `--terv-kiemel`
 * erteke `oklch(0.62 0.13 45)`, ami PONTOSAN a tervbeli jelveny hattere.
 *
 * Vagyis a jelveny a helyes szint kapna anelkul, hogy barmi kulonlegeset
 * kellene ra irni -- de a valtas MAGA meg nem tortent meg, mert a hatter es a
 * szoveg egyutt mozdul, es az acrobot dontese.
 *
 * === EGY KOCKAZAT, AMIT A TERV NEM TUDOTT MEGMUTATNI ===
 *
 * A jelveny egy FENYKEPEN all (az elso kep bal felso sarkaban). A korabbi
 * majdnem fekete alap (`bg-neutral-900/85`) BARMILYEN fotorol elvalt. A rez nem
 * feltetlenul: egy meleg tonusu korall-fotón a rez hatter beleolvadhat.
 *
 * ES A TERV EZT NEM IS MUTATHATTA MEG: a tervlap EGYETLEN fotoval keszult,
 * tehat a kockazat rajta nem latszhatott. Ez nem a terv hibaja -- egy makett
 * egy peldat mutat, nem eloszlast.
 *
 * A DONTES KET RESZBOL ALL (acrobot, msg_id 14884), es a SORREND szandekos:
 *
 *   1. a valtas megy, a terv szerint -- a terv kovetese az alapertelmezes
 *   2. telepites utan HAROM valodi korall lapon meg kell nezni a jelvenyt
 *
 * ES HA BELEOLVAD, A JAVITAS NEM A REGI BOROSTYAN VISSZAALLITASA, hanem egy
 * ELVALASZTO RETEG a rez ALATT (arnyék vagy vekony keret). Ezt azert kell itt
 * kimondani, mert a kezenfekvo lepes a visszaallitas lenne -- es az a tervtol
 * vinne el, holott a problema nem a szinnel van, hanem a HATTERREL, amin all.
 *
 * Csak MERT adaton terunk el a tervtol, nem feltetelezesre.
 *
 * TISZTA MEGJELENÍTÉS: nincs adatlekérése és nem tudja, melyik lapon áll --
 * ezért használható a műszaki lapon is, ha ott valaha kell.
 *
 * === A `backdrop-blur-sm` 2026-09-08-IG ITT ALLT, ES HALOTT EFFEKT VOLT ===
 *
 * A regi jelveny ATLATSZO sotet fatyol volt (`bg-neutral-900/85`), es a blur
 * ahhoz tartozott: volt mit atengedni. A #157 ota a hatter a `--terv-kiemel`
 * TOMOR erteke, tehat a blur azt homalyositja, amit egy atlatszatlan felulet
 * amugy is takar. Senki nem latja.
 *
 * NEM KOZOMBOS, HOGY OTTMARAD: a `backdrop-filter` sajat kompozicios reteget
 * kenyszerit ki, es -- ami tobbet szamit -- azt SUGALLJA a kovetkezo
 * olvasonak, hogy a felulet atlatszo. Aki ezt hiszi, mast fog javitani,
 * amikor a jelveny olvashatosagat kell allitani.
 *
 * (acrobot dontese, msg 15106, 2. pont: "LEGYEN TELJESEN ATLATSZATLAN. A mai
 * 85 szazalek es a backdrop-blur azert all ott, mert atlatszo sotet fatyol
 * volt a szandek." A 85 szazalek a #157-tel mar elment, a blur ittmaradt.)
 */
export default function UniquePieceBadge({
  className = "",
}: {
  className?: string
}) {
  return (
    <span
      data-testid="unique-piece-badge"
      className={
        "absolute left-3 top-3 z-10 px-3 py-1 " +
        "text-xs font-semibold uppercase tracking-wide " +
        "shadow-sm " +
        className
      }
      style={{
        background: "var(--terv-kiemel)",
        color: "var(--terv-kiemel-szoveg)",
      }}
    >
      1 db · Egyedi példány
    </span>
  )
}

/**
 * A JELVÉNY MELLÉ TARTOZÓ MONDAT, A KÉP ALATT (picasso terve, 2026-09-07).
 *
 * Külön komponens, mert MÁSHOL áll: a jelvény a képen belül, ez a kép alatt.
 * Egy komponensbe téve az egyik a másik pozicionálását örökölné.
 *
 * "Ha ez az egy mondat lemarad, a jelvény önmagában félreérthető marad."
 */
export function UniquePiecePromise({ className = "" }: { className?: string }) {
  return (
    <p
      data-testid="unique-piece-promise"
      className={"text-xs leading-relaxed " + className}
      style={{ color: "var(--terv-szoveg-halvany)" }}
    >
      {UNIQUE_PIECE_PROMISE}
    </p>
  )
}
