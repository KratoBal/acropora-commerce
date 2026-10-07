/**
 * ENGEDI-E EGY robots.txt EGY UTAT (SEO frontend FE-8, Balazs 2026-10-07, 4. pont).
 *
 * A dontes: a kereso- es facet-URL `noindex`, de a robots.txt NE tiltsa. Egy
 * tiltott URL-t a kereso le sem tolti, tehat a `noindex`-et sem latja, es a cim
 * a talalatok kozott maradhat. Ez a fuggveny a Google szabalyai szerint dont, hogy
 * a teszt ezt gepiesen ellenorizze:
 *
 * - a csoportot a legpontosabb `User-agent` adja (a sajat nev, kulonben `*`);
 * - a minta az ut ELEJERE illeszt; `*` barmi, a zaro `$` az ut vege;
 * - tobb illeszkedo szabalybol a HOSSZABB minta nyer, egyenlo hossznal az Allow;
 * - az ures `Disallow:` nem tilt semmit.
 */
type Szabaly = { engedi: boolean; minta: string }

function csoportok(
  szoveg: string,
): { ugynokok: string[]; szabalyok: Szabaly[] }[] {
  const eredmeny: { ugynokok: string[]; szabalyok: Szabaly[] }[] = []
  let aktualis: { ugynokok: string[]; szabalyok: Szabaly[] } | null = null
  let ugynokSor = false
  for (const nyers of szoveg.split(/\r?\n/)) {
    const sor = nyers.replace(/#.*$/, "").trim()
    const kettospont = sor.indexOf(":")
    if (kettospont < 0) continue
    const kulcs = sor.slice(0, kettospont).trim().toLowerCase()
    const ertek = sor.slice(kettospont + 1).trim()
    if (kulcs === "user-agent") {
      if (!aktualis || !ugynokSor) {
        aktualis = { ugynokok: [], szabalyok: [] }
        eredmeny.push(aktualis)
      }
      aktualis.ugynokok.push(ertek.toLowerCase())
      ugynokSor = true
      continue
    }
    ugynokSor = false
    if (!aktualis) continue
    if (kulcs === "allow" || kulcs === "disallow") {
      if (ertek === "") continue
      aktualis.szabalyok.push({ engedi: kulcs === "allow", minta: ertek })
    }
  }
  return eredmeny
}

function illeszkedik(minta: string, ut: string): boolean {
  const vegeHorgony = minta.endsWith("$")
  const torzs = vegeHorgony ? minta.slice(0, -1) : minta
  const regex = torzs
    .split("*")
    .map((resz) => resz.replace(/[.+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*")
  return new RegExp(`^${regex}${vegeHorgony ? "$" : ""}`).test(ut)
}

/** `true`, ha az `ugynok` a `ut`-at (utvonal + query) bejarhatja. */
export function robotsEngedi(
  szoveg: string,
  ut: string,
  ugynok = "googlebot",
): boolean {
  const mind = csoportok(szoveg)
  const sajat = mind.filter((cs) =>
    cs.ugynokok.some((u) => u !== "*" && ugynok.toLowerCase().includes(u)),
  )
  const csoport = sajat.length
    ? sajat
    : mind.filter((cs) => cs.ugynokok.includes("*"))
  let nyertes: Szabaly | null = null
  for (const cs of csoport)
    for (const sz of cs.szabalyok) {
      if (!illeszkedik(sz.minta, ut)) continue
      if (
        !nyertes ||
        sz.minta.length > nyertes.minta.length ||
        (sz.minta.length === nyertes.minta.length && sz.engedi)
      )
        nyertes = sz
    }
  return nyertes ? nyertes.engedi : true
}
