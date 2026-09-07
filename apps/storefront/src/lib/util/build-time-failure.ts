/**
 * A HAROM EPITES-IDEJU UTVONAL KOZOS HIBA-KEZELESE.
 *
 * A termek-, kategoria- es gyujtemeny-lap `generateStaticParams` fuggvenye
 * BUILD KOZBEN kerdezi le a boltot. Ha a bolt epp nem valaszol, a build elhasal
 * -- es a hibauzenet a nyers halozati hiba (`fetch failed`, `ECONNREFUSED`,
 * `Service Unavailable`), amibol nem latszik, hogy a KODHOZ semmi koze.
 *
 * MERVE 2026-09-07 15:43-kor: a stage nehany percre elment egy lemez-takaritas
 * alatt, es a kapu pirosra valtott egy olyan agon, ami egy tesztfajlt adott
 * hozza. A kirakat addigra sikeresen LEFORDULT; a bukas a lap-adatok
 * begyujtesenel jott.
 *
 * === MIERT NEM URES LISTAT ADUNK VISSZA ===
 *
 * A kezenfekvo alternativa az, hogy hiba eseten ures listat adunk: a lapok akkor
 * keres-idoben rendelodnek, es a build atmegy. Ezt egy korral korabban meg is
 * irtam igy.
 *
 * Acrobot dontese (2026-09-07 16:37) ez ellen szol, es az erve erosebb: egy
 * ures lista a VALODI hibat is elnyelne, es a nemasag a rosszabb. Egy zold
 * build, ami csendben eloregyartas nelkul szallit, senkinek nem tunik fel --
 * egy piros build viszont megall.
 *
 * A HARMADIK UT tehat: a bukas MARAD, de az uzenet mondja meg, MIT kell
 * megnezni. Nem a kaput gyengitjuk, hanem az olvashatosagat javitjuk.
 *
 * === ES A FELTETEL, AMI EZT UJRANYITJA ===
 *
 * Ha a bolt kiesese HAROMSZOR viszi pirosra a kaput ugy, hogy a kodhoz semmi
 * koze, akkor a kerdest ujra elovesszuk. A szamlalo a kartyan all -- kulonben
 * a "tul gyakran bukik" ERZES fog donteni, nem szam.
 *
 * Mai allas: EGY ilyen eset (2026-09-07 15:43).
 */

/**
 * A halozat- es szolgaltatas-szintu hibak jelei. Nem teljes lista, es nem is
 * lehet az: a cel az, hogy a GYAKORI eseteket felismerjuk es megnevezzuk, nem
 * az, hogy minden mast kod-hibanak minositsunk.
 */
const SZOLGALTATAS_JELEI = [
  "fetch failed",
  "ECONNREFUSED",
  "ENOTFOUND",
  "ETIMEDOUT",
  "EAI_AGAIN",
  "socket hang up",
  "Service Unavailable",
  "Bad Gateway",
  "Gateway Timeout",
]

export function boltHibanakLatszik(error: unknown): boolean {
  const szoveg =
    error instanceof Error
      ? `${error.message} ${String((error as { cause?: unknown }).cause ?? "")}`
      : String(error)

  return SZOLGALTATAS_JELEI.some((jel) =>
    szoveg.toLowerCase().includes(jel.toLowerCase())
  )
}

/**
 * Kiirja a diagnozist, es TOVABBDOBJA a hibat.
 *
 * A visszateresi tipusa `never`, hogy a hivo oldalan ne kelljen `return`-t irni
 * utana -- a fordito tudja, hogy innen nem jon vissza a vezerles.
 */
export function epitesiHibaMegnevezve(
  utvonal: string,
  error: unknown,
  boltCime = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "(nincs cim beallitva)"
): never {
  const ok = error instanceof Error ? error.message : String(error)

  if (boltHibanakLatszik(error)) {
    console.error(
      [
        "",
        `A BOLT NEM VALASZOL (${boltCime}).`,
        "",
        `EZ NEM KOD-HIBA. A build a(z) ${utvonal} lapjait EPITES KOZBEN kerdezi`,
        "le a bolttol, tehat a kapu a bolt elerhetetlensegetol is pirosra valt.",
        "",
        "TEENDO: nezd meg, fut-e a bolt, es ha igen, INDITSD UJRA a futast.",
        "A kodhoz nem kell hozzanyulni.",
        "",
        `A nyers hiba: ${ok}`,
        "",
      ].join("\n")
    )
  } else {
    console.error(
      `A(z) ${utvonal} lapjainak begyujtese elhasalt, es ez NEM a bolt elerhetetlensegere vall: ${ok}`
    )
  }

  throw error
}
