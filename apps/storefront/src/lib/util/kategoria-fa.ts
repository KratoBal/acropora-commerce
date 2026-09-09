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
 * EGY OS-LANC ROVID NEVEI, A GYOKERTOL LEFELE.
 *
 * Ugyanaz a levezetes, mint a `besorolasUt` belsejeben -- de az a TERMEK
 * kategoriaibol indul, ez pedig egy MAR MEGLEVO lancbol. A kategoria-lap a
 * sajat felmenoit a `parent_category` mezobol epiti, tehat nincs szuksege a
 * teljes katalogusra.
 *
 * MIERT LANCBAN, ES NEM ELEMENKENT: minden szint rovid neve a SZULO ROVID
 * nevetol fugg. Egy `rovidNev(nev, szulo.name)` hivas a masodik szinten mar
 * rosszat adna, mert a szulo nevében is benne all a nagyszulo.
 */
export const rovidNevekLancban = <T extends { name?: string | null }>(
  lanc: T[],
): string[] => {
  const ki: string[] = []
  for (const elem of lanc) {
    const szuloRovid = ki.length ? ki[ki.length - 1] : null
    ki.push(rovidNev(elem.name ?? "", szuloRovid))
  }
  return ki
}

/**
 * A MEGJELENITENDO NEVEK A TELJES LISTABOL -- ROVIDITVE, DE CSAK HA EGYEDI.
 *
 * === MIT RONTANA EL A FELTETEL NELKULI VAGAS ===
 *
 * A mai adatban minden gyermek-nev `NEV - SZULONEV` alaku, tehat a vagas
 * pontosan azt a zajt szunteti meg, amirol Balazs dontott. A dontes viszont az
 * ADATBAN oldja fel az utkozest, es a betoltes MEG NEM FUTOTT LE. Amikor
 * lefut, a kategoriak KET csoportra valnak (Balazs merese, 2026-09-04):
 *
 *     EGYEDI rovid nevu, a nev magatol rovid lesz          142
 *     UTKOZO, a nev SZANDEKOSAN megtartja a szulot          77
 *
 * A masodik csoportban a szulo nem zaj, hanem a MEGKULONBOZTETES: az
 * "Aquaforest" HET kulonbozo kategoria rovid neve (Koralltapok, Haleledelek,
 * Aminosavak es vitaminok, ...). Egy feltetel nelkuli vagas pont azt a hetet
 * mosna ossze, amit a dontes szetvalasztott -- es a hiba a BETOLTES UTAN
 * jelenne meg, tehat regressziónak latszana, holott ma keletkezne.
 *
 * === A SZABALY, ES HOGY A 142/77 A KIMENETE, NEM A BEMENETE ===
 *
 * A szabaly nem az, hogy "a 77 listan levo nevet ne vagd le" -- olyan listank
 * nincs, es nem is kell. A szabaly ez: VAGJ, HA A ROVID NEV EGYEDI A TELJES
 * KATEGORIA-LISTABAN. A 142 es a 77 ennek a szabalynak a KIMENETE: Balazs
 * meresebol szarmazo szam arrol, hany kategoriara hogyan fog sulni. Aki ezt
 * megforditja, egy kezzel tartott listat fog keresni, ami soha nem letezett.
 *
 * Ezert a fuggveny a mai adaton IS es a betoltes utani adaton IS ugyanazt
 * mondja, es a viselkedese nem fugg attol, melyik allapotban vagyunk.
 *
 * === AMIT NEM FED LE, ES KIMONDOM ===
 *
 * Az egyediseget a ROVID nevek kozott meri, nem az osszes megjelenő nev
 * kozott. Ha egy kategoria rovid neve megegyezne egy MASIK kategoria TELJES
 * nevevel, azt ez nem veszi eszre. A mai adaton ilyet nem mertem -- es azt sem
 * allitom, hogy nincs: a teljes katalogus innen nem erheto el (a bolt kulcsa
 * nem jut ki a bongeszobe, es a lap szerver oldalon rendereli a menut).
 */
export const megjelenitendoNevek = (
  mind: {
    id?: string | null
    name?: string | null
    parent_category_id?: string | null
  }[],
): Map<string, string> => {
  type Elem = { id: string; name: string; parent_category_id?: string | null }
  const teljesek: Elem[] = mind.flatMap((c) =>
    c.id && c.name
      ? [{ id: c.id, name: c.name, parent_category_id: c.parent_category_id }]
      : [],
  )
  const azonositora = new Map(teljesek.map((c) => [c.id, c]))

  /*
    A JELOLT ROVID NEV A LANCBOL SZAMOL, ES MEMOIZALT. Minden szint a SZULO
    rovid nevetol fugg -- ugyanaz a levezetes, mint a `rovidNevekLancban`-ban,
    csak itt azonosito szerint kell, mert a lista lapos.

    A ciklus-vedelem nem elmeleti: egy sérült szulo-hivatkozas vegtelen
    rekurziot adna, es a lap egyszeruen nem tolteni be.
  */
  const jeloltek = new Map<string, string>()
  const jelolt = (elem: Elem, latott: Set<string>): string => {
    const kesz = jeloltek.get(elem.id)
    if (kesz !== undefined) return kesz
    if (latott.has(elem.id)) return elem.name.trim()
    latott.add(elem.id)

    const szulo = elem.parent_category_id
      ? azonositora.get(elem.parent_category_id)
      : undefined
    const szuloRovid = szulo ? jelolt(szulo, latott) : null
    const ki = rovidNev(elem.name, szuloRovid)
    jeloltek.set(elem.id, ki)
    return ki
  }
  for (const elem of teljesek) jelolt(elem, new Set())

  const elofordulas = new Map<string, number>()
  /*
    A `jeloltek.values()` bejarasa a mai forditasi cellal nem megy
    (`downlevelIteration`), ezert az ELEMEKEN megyunk vegig -- ugyanaz a
    halmaz, mert minden elem pontosan egy jeloltet kapott.
  */
  for (const elem of teljesek) {
    const nev = jeloltek.get(elem.id) ?? elem.name.trim()
    elofordulas.set(nev, (elofordulas.get(nev) ?? 0) + 1)
  }

  const ki = new Map<string, string>()
  for (const elem of teljesek) {
    const rovid = jeloltek.get(elem.id) ?? elem.name.trim()
    ki.set(elem.id, elofordulas.get(rovid) === 1 ? rovid : elem.name.trim())
  }
  return ki
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

  /*
    A MEGJELENITENDO NEV A TELJES LISTABOL JON, NEM A LANCBOL.

    Itt korabban a lanc sajat levezetese allt (`rovidNev` a szulo mar
    kiszamolt rovid nevevel). Az a vagas FELTETEL NELKUL vagott, tehat a
    betoltes utan pont azt a szulo-utotagot vitte volna el a 77 UTKOZO
    kategoriarol, amit a dontes szandekosan megtart. Az egyedisegrol a
    lanc nem tud dontenni -- ahhoz a TELJES lista kell, es az itt amugy is
    a kezunkben van (`mind`).
  */
  const nevek = megjelenitendoNevek(mind)

  const ki: { id: string; nev: string; teljesNev: string }[] = []
  for (const elem of leghosszabb) {
    ki.push({
      id: elem.id,
      nev: nevek.get(elem.id) ?? elem.name.trim(),
      teljesNev: elem.name.trim(),
    })
  }
  return ki
}
