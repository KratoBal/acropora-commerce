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
  { felirat: "Tudástár", tema: "tudastar" },
  { felirat: "Szolgáltatások", tema: "szolgaltatasok" },
  { felirat: "Akváriumaim", tema: "akvariumaim" },
]

/**
 * A HAMAROSAN LAP TEMAI: minden menupont (hogy egy eltuno gyoker se adjon
 * halott linket), plusz a kereso sav szakerto-gombja (217:68).
 */
export const HAMAROSAN_TEMAK: ReadonlyMap<string, string> = new Map([
  ...FEJLEC_MENU_TERV.map((pont) => [pont.tema, pont.felirat] as const),
  ["szakerto", "Kérdezz a szakértőnktől"],
])

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
): FejlecMenuPont<T>[] {
  const alkategoriak = gyokerek.flatMap((gyoker) => [
    ...(gyoker.category_children ?? []),
  ])
  return FEJLEC_MENU_TERV.map((terv): FejlecMenuPont<T> => {
    const gyoker = terv.gyoker
      ? gyokerek.find((g) => kulcs(g.handle) === terv.gyoker)
      : undefined
    if (gyoker) {
      return { tipus: "gyoker", felirat: terv.felirat, kategoria: gyoker }
    }
    const alkategoria = terv.alkategoria
      ? alkategoriak.find((k) => kulcs(k.handle) === terv.alkategoria)
      : undefined
    if (alkategoria?.handle) {
      return {
        tipus: "oldal",
        felirat: terv.felirat,
        handle: alkategoria.handle,
      }
    }
    return { tipus: "hamarosan", felirat: terv.felirat, tema: terv.tema }
  })
}
