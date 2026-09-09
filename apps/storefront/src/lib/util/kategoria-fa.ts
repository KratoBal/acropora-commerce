import { HttpTypes } from "@medusajs/types"

/**
 * A GYOKEREK, KET SZINT GYEREKKEL -- KULON, TISZTA FUGGVENYKENT.
 *
 * MIERT NEM A HIVO BELSEJEBEN: ott halozati hivasok kozott ulne (`listCategories`,
 * `listProducts`), es semmilyen teszt nem latna. Igy viszont egy sima tomb megy
 * be es egy sima tomb jon ki, tehat MERHETO -- ugyanaz a lepes, amit a lapunk
 * ugy nevez, hogy ha a hely nem merheto, a KODOT kell elmozditani.
 */
export const gyokerekKetSzintel = (
  mind: HttpTypes.StoreProductCategory[],
): HttpTypes.StoreProductCategory[] => {
  const szuloje = (c: HttpTypes.StoreProductCategory) =>
    (c as { parent_category_id?: string | null }).parent_category_id

  const kozvetlenGyerekei = (id: string) =>
    mind.filter((c) => szuloje(c) === id)

  return mind
    .filter((c) => !szuloje(c))
    .map((gy) => ({
      ...gy,
      category_children: kozvetlenGyerekei(gy.id).map((k) => ({
        ...k,
        category_children: kozvetlenGyerekei(k.id),
      })),
    })) as HttpTypes.StoreProductCategory[]
}

/**
 * A KATEGORIA SAJAT, ROVID NEVE -- A SZULO NEVE NELKUL.
 *
 * A boltunk kategoria-nevei a szulo nevet is hordozzak, `NEV - SZULONEV`
 * alakban. Merve 2026-09-09 a kitelepitett bolt mega-menujebol:
 *
 *     megvizsgalt gyermek-nev                        92
 *     a "NEV - SZULONEV" mintat koveti               92
 *     nem koveti                                      0
 *
 * A HATAR: a menu csoportonkent legfeljebb ot gyereket mutat, tehat a 92
 * MINTA, nem a teljes fa. A 92-bol 92 tul sima szam ahhoz, hogy magatol
 * ertetodonek vegyuk -- itt viszont van ra magyarazat: a neveket egy vetites
 * allitja elo, tehat mechanikus egyformasag varhato.
 *
 * === MIERT A MEGJELENITESBEN, ES NEM AZ ADATBAN ===
 *
 * Az adatot NEM irjuk at, es ez nem ovatossag, hanem szandek. A szulo neve a
 * KERESONEK, a menunek es a morzsamenunek meg kellhet: ott az UT szamit, nem a
 * besorolas. Ha valaki ezt a rovidites "megjavitja" a forrasnal (a vetitesben,
 * ami masik repoban all), akkor MINDEN olvaso elveszti, es nem csak ez az
 * egy sor. Ezert all itt, es ezert nem ott.
 *
 * === ES MIERT CSAK PONTOS EGYEZESRE ===
 *
 * A levagas nem MINTAT talalgat: a szulo neve ugyanabban a lancban all, tehat
 * ismert ertekhez hasonlitunk. Ha egyszer megvaltozik a nevadas, ez a fuggveny
 * NEM ROSSZUL ROVIDIT, hanem NEM ROVIDIT -- a nev teljes egeszeben latszik.
 * A ket viselkedes kozott egy karakter a kulonbseg a kodban, es evek a
 * kulonbseg a kovetkezmenyben. (acrobot kikotese, 2026-09-09, uzenet 16775.)
 */
export const rovidNev = (
  nev: string,
  szuloRovidNeve: string | null,
): string => {
  const tiszta = nev.trim()
  if (!szuloRovidNeve) return tiszta

  const utotag = ` - ${szuloRovidNeve}`
  return tiszta.endsWith(utotag)
    ? tiszta.slice(0, tiszta.length - utotag.length)
    : tiszta
}

/**
 * A TERMEK BESOROLASI UTJA, A GYOKERTOL A LEGMELYEBB KATEGORIAIG.
 *
 * === MIERT A TELJES LISTABOL, ES NEM A TERMEK SAJAT MEZOJEBOL ===
 *
 * A bolt a termekhez a hozzarendelt (LEVEL) kategoriakat adja vissza, az
 * oseiket nem. Egy olyan lanc, ami a termek sajat `categories` tombjeben keres
 * szulo nelkuli elemet, ezert URESET ad -- es ezt nem elmeletben tudjuk:
 * 2026-09-09-en TIZENHAROM megmert termeklapbol NULLA-n jelent meg a besorolas
 * sora. Pozitiv kontrollal, tehat a nulla nem a kereses tulajdonsaga volt.
 *
 * A morzsamenu epp ezert dolgozott mar akkor is a teljes listabol. Ez a
 * fuggveny azert kozos, hogy a KET olvaso ne ketfele vezesse le ugyanazt: egy
 * masodik levezetes elobb-utobb elcsuszik, es a ket sor egymas alatt all.
 */
export const besorolasUt = (
  termek: { categories?: { id: string }[] | null },
  /**
   * A BEMENET MEZOI ELHAGYHATOK, mert a bolt tipusa is ilyen
   * (`KategoriaKatalogus`). Az azonosito vagy a nev NELKULI bejegyzeseket
   * kihagyjuk: egy nev nelkuli elem nem jelenithato meg, egy azonosito nelkuli
   * pedig nem is kotheto a fahoz. A kihagyas SZAMA nem latszik sehol, ezert
   * all itt: ha valaha ures lancot latsz teli katalogus mellett, ITT kezdd.
   */
  mind: {
    id?: string | null
    name?: string | null
    parent_category_id?: string | null
  }[],
): { id: string; nev: string; teljesNev: string }[] => {
  type Elem = { id: string; name: string; parent_category_id?: string | null }
  const teljesek: Elem[] = mind.flatMap((c) =>
    c.id && c.name
      ? [{ id: c.id, name: c.name, parent_category_id: c.parent_category_id }]
      : [],
  )
  const azonositora = new Map(teljesek.map((c) => [c.id, c]))

  const felmenok = (kezdo: Elem) => {
    const ut: Elem[] = []
    const latott = new Set<string>()
    let jelenlegi: Elem | undefined = kezdo
    while (jelenlegi && !latott.has(jelenlegi.id)) {
      latott.add(jelenlegi.id)
      ut.unshift(jelenlegi)
      jelenlegi = jelenlegi.parent_category_id
        ? azonositora.get(jelenlegi.parent_category_id)
        : undefined
    }
    return ut
  }

  const leghosszabb = (termek.categories ?? []).reduce<Elem[]>(
    (eddigi, sajat) => {
      const helyi = azonositora.get(sajat.id)
      const jelolt = helyi ? felmenok(helyi) : []
      return jelolt.length > eddigi.length ? jelolt : eddigi
    },
    [],
  )

  const ki: { id: string; nev: string; teljesNev: string }[] = []
  for (const elem of leghosszabb) {
    const szuloRovid = ki.length ? ki[ki.length - 1].nev : null
    ki.push({
      id: elem.id,
      nev: rovidNev(elem.name, szuloRovid),
      teljesNev: elem.name.trim(),
    })
  }
  return ki
}
