import { translator, type Key, type Translate } from "@lib/i18n/dictionary"

/**
 * A FEJLEC MENUPONTJAI A FIGMA KERETBOL (2026-09-29).
 *
 * Balazs, 2026-09-29 05:23 UTC: a korall adatlap keretei (asztali 215:41,
 * mobil 220:3) a kanonikusak, "es a fejlec is benne van ezekben", majd: "a
 * menu is minden elemevel". Ez felulirja a 2026-09-09-i negyes sorrendet.
 *
 * A LISTA ES A SORREND tehat a keretbol jon (217:51-217:58), nem a
 * katalogusbol. A katalogus azt donti el, HOVA mutat egy pont:
 *
 *   - ha a pont katalogus-gyokere letezik (es nem ures), a gyoker lenyiloja
 *     nyilik, ugyanugy, mint eddig;
 *   - ha a pontnak alkategoria-oldala van (Vizkezeles), arra mutat;
 *   - kulonben a "Hamarosan" lapra, SOHA nem halott linkre.
 *
 * Ez utobbi ket szabaly acrobot dontese (2026-09-29, 07:24 es 07:27).
 *
 * A gyoker, ami nincs a keretben (a stage-en: Termékek, "Shop 'n the Shop",
 * Édesvízi akvarisztika), NEM kerul a fejlec menujebe.
 */
export type FejlecMenuTerv = {
  felirat: string
  /**
   * A felirat szotar-kulcsa, ha a pont NEM kategoria-nev (Tudastar, Szolgaltatasok,
   * Akvariumaim): azt az angol kirakat fordítja. A kategoria-nevek (Korallok,
   * Halak, ...) a bolt adatai, azokat nem fordítjuk.
   */
  kulcs?: Key
  /** A Hamarosan lap cime is ez: `/hamarosan/<tema>`. */
  tema: string
  /** A katalogus-gyoker handle-je, ekezet es kis-nagybetu nelkul. */
  gyoker?: string
  /** Egy nem-gyoker kategoria handle-je, ha gyoker nincs. */
  alkategoria?: string
}

export const FEJLEC_MENU_TERV: readonly FejlecMenuTerv[] = [
  { felirat: "Korallok", tema: "korallok", gyoker: "korallok" },
  { felirat: "Halak", tema: "halak", gyoker: "halak" },
  { felirat: "Gerinctelenek", tema: "gerinctelenek", gyoker: "gerinctelenek" },
  { felirat: "Technika", tema: "technika", gyoker: "technika" },
  {
    felirat: "Vízkezelés",
    tema: "vizkezeles",
    gyoker: "vizkezeles",
    alkategoria: "vizkezeles---termekek",
  },
  { felirat: "Tudástár", tema: "tudastar", kulcs: "nav.knowledge" },
  {
    felirat: "Szolgáltatások",
    tema: "szolgaltatasok",
    kulcs: "nav.services",
  },
  { felirat: "Akváriumaim", tema: "akvariumaim", kulcs: "nav.myAquariums" },
]

/**
 * A HAMAROSAN LAP TEMAI: minden menupont (hogy egy eltuno gyoker se adjon
 * halott linket), plusz a kereso sav szakerto-gombja (217:68).
 */
export const HAMAROSAN_TEMAK: ReadonlyMap<string, string> = new Map([
  ...FEJLEC_MENU_TERV.map((pont) => [pont.tema, pont.felirat] as const),
  ["szakerto", "Kérdezz a szakértőnktől"],
])

/**
 * A HAMAROSAN LAP CIME A LAP NYELVEN: a menupont szotar-kulcsos felirata
 * (Tudastar, Szolgaltatasok, Akvariumaim) lefordul, a szakerto-gomb sajat
 * kulcsot kap, a kategoria-nevek (Korallok, Halak, ...) a bolt adatai, azok
 * nem. Ismeretlen temanal `undefined` (a lap 404).
 */
export function hamarosanCim(tema: string, t: Translate): string | undefined {
  if (tema === "szakerto") return t("hamarosan.expert")
  const terv = FEJLEC_MENU_TERV.find((pont) => pont.tema === tema)
  if (!terv) return undefined
  return terv.kulcs ? t(terv.kulcs) : terv.felirat
}

type Kategoria = {
  handle?: string | null
  category_children?: readonly Kategoria[] | null
}

export type FejlecMenuPont<T extends Kategoria> =
  | { tipus: "gyoker"; felirat: string; kategoria: T }
  | { tipus: "oldal"; felirat: string; handle: string }
  | { tipus: "hamarosan"; felirat: string; tema: string }

export const kulcs = (handle: string | null | undefined) =>
  (handle ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()

export function fejlecMenuPontok<T extends Kategoria>(
  gyokerek: readonly T[],
  t: Translate = translator("hu"),
): FejlecMenuPont<T>[] {
  const alkategoriak = gyokerek.flatMap((gyoker) => [
    ...(gyoker.category_children ?? []),
  ])
  return FEJLEC_MENU_TERV.map((terv): FejlecMenuPont<T> => {
    const felirat = terv.kulcs ? t(terv.kulcs) : terv.felirat
    const gyoker = terv.gyoker
      ? gyokerek.find((g) => kulcs(g.handle) === terv.gyoker)
      : undefined
    if (gyoker) {
      return { tipus: "gyoker", felirat, kategoria: gyoker }
    }
    const alkategoria = terv.alkategoria
      ? alkategoriak.find((k) => kulcs(k.handle) === terv.alkategoria)
      : undefined
    if (alkategoria?.handle) {
      return {
        tipus: "oldal",
        felirat,
        handle: alkategoria.handle,
      }
    }
    return { tipus: "hamarosan", felirat, tema: terv.tema }
  })
}
