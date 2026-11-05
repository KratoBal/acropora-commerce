/**
 * AZ ADAGOLO-KALKULATOR MAGJA (V3.1, kartya 7fdbb15d). Tiszta fuggvenyek, a
 * kirakat ezekbol rajzol.
 *
 * A BEMENET AZ OS KANONIKUS ADAG-ALAKJA, ES CSAK AZ. Az OS a `dosing` tenyt a
 * JEV `parseDose` kimenetekent tarolja es vetiti (`fields.ts`
 * normalizeFieldValue -> `canonical`), egyetlen irasmoddal:
 *
 *   "5 ml/100 L/day"            naponta egyszer
 *   "1 drop/100 L, 1-2/week"    hetente egyszer-ketszer
 *   "1 drop/100 L, 3/week"      hetente haromszor
 *
 * Ami nem pontosan ilyen, arra NINCS kalkulator (`null`), es ez szandekos: egy
 * masodik, engedekenyebb olvaso ugyanannak a formatumnak csendben mast
 * olvasna ki, egy rossz adag pedig elo allatot olhet. A tenyt a lap ilyenkor
 * is kiirja, ahogy ma; csak szamolni nem szamolunk belole.
 */

export type Adag = {
  /** Az adag mennyisege a gyarto szerint (ml-ben vagy cseppben). */
  mennyiseg: number
  egyseg: "ml" | "csepp"
  /** Ennyi liter vizre szol a mennyiseg. */
  literre: number
  /** Ennyiszer az idoszakban (az also es a felso hatar; egyszeri: 1 es 1). */
  gyakorisag: { min: number; max: number }
  idoszak: "nap" | "het"
}

const SZAM = "(\\d+(?:\\.\\d+)?)"
const KANONIKUS = new RegExp(
  `^${SZAM} (drop|ml)/${SZAM} L(?:/(day|week)|, (\\d+)(?:-(\\d+))?/(day|week))$`,
)

const IDOSZAK = { day: "nap", week: "het" } as const

/** A kanonikus adag-alak olvasasa; minden mas `null`. */
export function adagOlvas(ertek: string | null | undefined): Adag | null {
  if (!ertek) return null
  const m = KANONIKUS.exec(ertek)
  if (!m) return null
  const [, mennyiseg, egyseg, literre, egyszeriIdoszak, min, max, idoszak] = m
  const gyMin = min === undefined ? 1 : Number(min)
  const gyMax = max === undefined ? gyMin : Number(max)
  const adag: Adag = {
    mennyiseg: Number(mennyiseg),
    egyseg: egyseg === "drop" ? "csepp" : "ml",
    literre: Number(literre),
    gyakorisag: { min: gyMin, max: gyMax },
    idoszak: IDOSZAK[(egyszeriIdoszak ?? idoszak) as "day" | "week"],
  }
  // ugyanazok a hatarok, mint a parseDose-ban: nulla adag, 1 alatti gyakorisag,
  // forditott tartomany vagy tort csepp nem adag
  if (!(adag.mennyiseg > 0) || !(adag.literre > 0)) return null
  if (gyMin < 1 || gyMax < gyMin) return null
  if (adag.egyseg === "csepp" && !Number.isInteger(adag.mennyiseg)) return null
  return adag
}

/** A vevo altal beirt liter: pozitiv szam, tizedesvesszovel is; mas `null`. */
export function literOlvas(beirt: string): number | null {
  const szoveg = beirt.trim().replace(",", ".")
  if (!/^\d+(?:\.\d+)?$/.test(szoveg)) return null
  const liter = Number(szoveg)
  return liter > 0 && liter <= 100_000 ? liter : null
}

export type Szamolt = {
  /**
   * Az alkalmankenti adag a vevo medencejere, LEFELE kerekitve (csepp: egesz, ml: egy tizedes). A kalkulator
   * SOHA nem ad a gyartoi aranynal tobbet (acrobot dontese, 2026-11-05, barracuda kerdesere: egy felfele
   * kerekitett csepp kis medencenel akar ketszeres adag, elo allatnal ez a veszelyes irany).
   */
  adag: number
  egyseg: Adag["egyseg"]
  /** A kerekites elotti, pontos ertek. */
  pontos: number
  /**
   * A lefele kerekitett adag 0 (cseppnel 1 csepp, ml-nel 0,1 ml alatt): a lap ilyenkor nem ad szamot, hanem
   * a pontos erteket es a gyartoi utmutatora kuldo mondatot.
   */
  tulKicsi: boolean
  /**
   * A lefele kerekites 20 szazaleknal tobbel kisebb a pontos erteknel (pl. 1,9 csepp helyett 1): a lap a
   * pontos erteket is kiirja mellette.
   */
  pontosIsKell: boolean
  gyakorisag: Adag["gyakorisag"]
  idoszak: Adag["idoszak"]
}

/** A lebegopontos szorzas (2,3 x 10 = 22,999...) ne vigye egy egesz ertek ala a lefele kerekitest. */
const EPSZILON = 1e-9

/** Az alkalmankenti adag egy `liter` literes medencere, sosem a gyartoi arany folott. */
export function adagSzamol(adag: Adag, liter: number): Szamolt {
  const pontos = (adag.mennyiseg * liter) / adag.literre
  const kerekitett =
    adag.egyseg === "csepp"
      ? Math.floor(pontos + EPSZILON)
      : Math.floor(pontos * 10 + EPSZILON) / 10
  const tulKicsi = kerekitett === 0
  return {
    adag: kerekitett,
    egyseg: adag.egyseg,
    pontos,
    tulKicsi,
    pontosIsKell: !tulKicsi && (pontos - kerekitett) / pontos > 0.2,
    gyakorisag: adag.gyakorisag,
    idoszak: adag.idoszak,
  }
}
