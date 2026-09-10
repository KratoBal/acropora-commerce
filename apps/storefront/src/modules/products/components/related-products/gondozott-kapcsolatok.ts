/**
 * A GONDOZOTT KAPCSOLATOK OLVASASA A TERMEK METAADATABOL.
 *
 * === MIERT LETEZIK EZ A FAJL, ES MIERT TISZTA FUGGVENYEKBOL ALL ===
 *
 * A kapcsolatok az Acropora OS adatbazisaban keletkeznek (`ProductRelation`), es
 * a Medusa Store termekenek NINCS termek-termek kapcsolat fogalma: a
 * `StoreProduct` harminchat mezoje kozott egy sincs. Merve 2026-09-08 a
 * tipuscsomagon. A lehetseges hordozok: `metadata`, `tags`, `collection`,
 * `categories`, `type`, `external_id`.
 *
 * A dontes az "A" ut lett (acrobot, msg_id 14892): a `metadata` AZONOSITOKAT
 * hordoz, es a kirakat egy MASODIK lista-lekerdezessel hozza el a termekeket.
 * Egy lekerdezessel szerkezetileg nem megy: a kapcsolodo termek cime, kepe es
 * ara a SAJAT rekordjan all.
 *
 * A `tags` utat egy MERT korlat zarta ki, nem izles: a `tag_id` szuro
 * HALMAZ-TAGSAGOT mer, a "hasonlo" es a "kiegeszito" viszont ket kulonbozo,
 * IRANYITOTT relacio ugyanazon termekek kozott.
 *
 * === A SZERZODES, ES HOGY KET OLDALON KELL EGYEZNIE ===
 *
 * A kulcs nevet ITT egyetlen konstans mondja meg, es a MEDUSA-VETITESNEK (az
 * Acropora OS oldalan) UGYANEZT a sztringet kell irnia. Ez pontosan az az alak,
 * amit a repo jegyzetei "egy szabaly ket helyen" neven gyujtenek: ha a ket
 * oldal elcsuszik, semmi nem hibazik -- a doboz egyszeruen nem jelenik meg,
 * es a hiba NEMA.
 *
 * Amit ez a fajl tehet ellene: a nevet EGY helyen mondja ki, exportalva, hogy a
 * masik oldal hivatkozhasson ra, ne masolja.
 *
 * === A TIZENKETTES HATAR NEM ESZTETIKA ===
 *
 * A `metadata` MINDEN termek-valaszon utazik, a LISTAKON is. A katalogusban
 * termekenkent atlagosan ~17 kapcsolat all (acrobot es barracuda merese), es
 * van mert precedensunk arra, mi tortenik, ha egy valasz elszall: a
 * kategoria-lekerdezes `*products`-szal 144 megabajtot huzott, a Next.js
 * gyorsitotar hatara 2 megabajt, es a bolt kifele 503-at adott.
 *
 * Ezert a hatar itt all, az OLVASO oldalon is: ha az iro oldal valaha tobbet
 * tenne bele, a kirakat akkor sem visz tobbet a lekerdezesbe.
 */

/**
 * A METAADAT-KULCS. Az iro oldalnak (a Medusa-vetitesnek) ugyanezt kell irnia.
 *
 * Az `unas_` elotag a vetites mai konvencioja minden UNAS-bol szarmazo mezore
 * (`unas_unit`, `unas_minimum_order_quantity`, `unas_product_url`), es a
 * kapcsolatok is onnan jonnek.
 */
/**
 * A PARJA MASIK REPOBAN ALL, ES A KETTOT SEMMILYEN FORDITAS NEM KOTI OSSZE:
 *
 *   acropora-os  apps/api/src/integrations/medusa/medusa-relations.policy.ts:72
 *                export const MEDUSA_SIMILAR_IDS_KEY = "unas_similar_ids"
 *
 * A ket repo kozott NINCS kozos csomag (a kirakat 42 fuggosege kozott nulla
 * workspace-fuggoseg all), tehat egyik repo SAJAT futasaba sem fer bele egy
 * allitas, ami a masikat is latna. Ha a ket sztring elter, a hasonlo-doboz
 * CSENDBEN ures marad.
 *
 * DE ATTOL MEG VAN ORZO, ES EZT A MEGJEGYZES ELOSZOR ELHALLGATTA -- HELYESBITVE.
 *
 * Barracuda 2026-09-08 delelott megirta, es a kozos mappaban all:
 *
 *     bash /home/marveen/marveen/scripts/hasonlo-kulcs-orzo.sh
 *
 * A GitHub API-rol olvassa MINDKET repo fo agat (nincs klon, nincs ref, tehat
 * nincs mihez kepest elavulni), es nem csak a KULCSOT veti ossze, hanem az
 * ELVALASZTOT is -- annak az elcsuszasa meg nemabb lenne: a doboz megjelenne,
 * csak nulla termekkel. Harom kilepesi kodja van, es a harmadik a lenyeg:
 * 0 egyezik, 1 elcsusztak (nev szerint), 2 NEM MERHETO -- mert egy atnevezett
 * konstans nulla talalatot ad, es a naiv osszevetes ilyenkor ZOLDET adna.
 * Mindket irany kulon kalibralva. Napi utemezesben fut.
 *
 * AMIT AZ ORZO MA NEM FED: a `KIEGESZITO_KULCS`-ot (lasd lentebb) -- arra ma
 * nulla emlites all benne, ismert pozitiv kontrollal merve (a hasonlo kulcsra
 * ot). Es azt sem, hogy az adat TENYLEGESEN atmegy-e; azt csak a bolt oldalan
 * lehet megnezni.
 *
 * EZ A MEGJEGYZES TEHAT NEM AZ EGYETLEN VEDELEM, HANEM A MASODIK: az orzo a
 * SZTRINGEK egyezeset meri, ez a sor pedig annak szol, aki ATNEVEZ -- hogy
 * tudja, hol a masik fele, mielott a napi futas rasz olna.
 *
 * MERVE 2026-09-08 (nautilus), ket kalibracioval:
 *   ha CSAK ez a konstans csuszik el, ket allitas pirosodik nev szerint a
 *     `lap-vaz/valodi-tartalom.spec.tsx`-ben -- mert annak a FIXTURE-je a
 *     literalt irja, mikozben a kod ezen a konstanson at olvas;
 *   ha viszont valaki KOVETKEZETESEN nevezi at (ezt a sort ES a fixture-t),
 *     479 teszt fut le nulla pirossal, es a repo semmit nem vesz eszre.
 *
 * A masodik a valodi kockazat, es ez a megjegyzes az egyetlen dolog, ami
 * ellene szol. Ezert all A SOR MELLETT es nem a fajl fejlecben: aki atnevez,
 * kereses-cserevel dolgozik, es a TALALT SORT latja, nem a fajl tetejet.
 *
 * ES AMIERT NEM VENNE ESZRE SENKI: 2026-09-08-an a stage 1492 termekebol
 * EGY viseli ezt a kulcsot. Az ures hasonlo-doboz ma a normal latvany, tehat
 * egy elcsuszott kulcs pontosan ugy nezne ki, mint a mai allapot.
 */
export const HASONLO_KULCS = "unas_similar_ids"

/**
 * A KIEGESZITOK KULCSA. UGYANAZ A SZABALY, MASIK LISTA.
 *
 * PAR: acropora-os apps/api/src/integrations/medusa/medusa-relations.policy.ts:88
 *      export const MEDUSA_ACCESSORY_IDS_KEY = "unas_accessory_ids"
 *
 * Ugyanaz a helyzet, mint a hasonlo kulcsnal: ket repo, kozos csomag nelkul, es
 * ha a ket sztring elter, a doboz CSENDBEN ures marad. Az indok, amiert a par
 * a sor mellett all es nem a fajl fejlecben, egy bekezdessel feljebb.
 *
 * ES EGY KULONBSEG, AMI SZAMIT: a hasonlo kulcs mar KIMEGY a boltba, ez MEG NEM.
 * Merve 2026-09-08 19:23:05-kor a teszt bolton, a teljes katalogust
 * vegiglapozva: 1492 termek, `unas_similar_ids` EGYEN, `unas_accessory_ids`
 * NULLAN.
 *
 * ES EZ NEM IDOZITES, HANEM ADAT: a vetites a kulcsot csak NEM URES listara
 * irja ki (`medusa-product-projection.service.ts`, `length > 0` feltetel).
 * Vagyis ugyanaz a termek, amelyik megkapta a hasonlo kulcsot, kiegeszito
 * kapcsolat NELKUL all -- nem az tortent, hogy a vetites meg nem ert oda.
 *
 * Amit ez az olvaso oldalrol jelent: a doboz addig nem jelenik meg, amig a
 * forrasban nincs ilyen kapcsolat. Ez a HELYES viselkedes, nem hiany.
 */
export const KIEGESZITO_KULCS = "unas_accessory_ids"

/**
 * A LISTA ROVIDEBB LEHET, MINT AHANY KAPCSOLAT AZ ACROPORA OS-BEN ALL -- ES EZ
 * A HELYES MUKODES, NEM HIANY.
 *
 * A kapcsolat celpontja lehet olyan termek, ami MEG NINCS a boltban: a
 * katalogusnak csak egy resze kelt at. Ilyenkor a vetitesnek nincs
 * Medusa-azonositoja hozza, es KIHAGYJA -- nem talal ki azonositot, es nem hagy
 * ures helyet. Egy nem letezo termekre mutato kapcsolat a vevonek 404 lenne.
 *
 * (acrobot kikotese, msg_id 14911. Az iro oldalon megvalositva:
 * `apps/api/src/integrations/medusa/medusa-relations.policy.ts`, acropora-os
 * #604 -- a kihagyottak SZAMA a vetites kimenetere kerul, kulon sorban.)
 *
 * AMIERT EZ ITT ALL, ES NEM CSAK AZ IRO OLDALON: aki ezt a fajlt olvassa, azt
 * latja, hogy egy termekhez tizenhet kapcsolat all az OS-ben, es a lapon ot
 * jelenik meg. A ket szam kulonbsegenek HAROM oka lehet, es csak az egyik hiba:
 *
 *   a celpont meg nincs a boltban    <- varhato, atmeneti, magatol megszunik
 *   a celpont torolve vagy nem publikalt <- `kertSorrendben` hagyja ki, lentebb
 *   a KAPCSOLAT_HATAR levagta         <- szandekos, ez a fajl donti el
 *
 * A harom kozul egyik sem hibazik, es mind a harom rovidebb listat ad. Enelkul
 * a megjegyzes nelkul a kovetkezo olvaso a hianyt keresne, nem a magyarazatot.
 */

/** A doboz ennyit tud megmutatni, es ennyi utazhat a metaadatban. */
export const KAPCSOLAT_HATAR = 12

/**
 * AZONOSITOK KIOLVASASA -- ES MINDEN LEPES EGY MERT OKBOL VAN ITT.
 *
 * A `metadata` erteke a Medusaban SZTRING, tehat a lista elvalasztott alakban
 * utazik. A tisztitas nem ovatoskodas: egy ures elem a lekerdezesben ures
 * `id` szurot adna, es az a szuro NEM szur -- vagyis a doboz ujra a katalogus
 * elejet mutatna, pontosan azt az allapotot, amit ez a valtozas megszuntet.
 */
export function kapcsolatAzonositok(
  metadata: Record<string, unknown> | null | undefined,
  kulcs: string,
): string[] {
  const nyers = metadata?.[kulcs]
  if (typeof nyers !== "string") return []

  const latott = new Set<string>()
  const ki: string[] = []
  for (const darab of nyers.split(",")) {
    const id = darab.trim()
    if (!id || latott.has(id)) continue
    latott.add(id)
    ki.push(id)
    if (ki.length === KAPCSOLAT_HATAR) break
  }
  return ki
}

/**
 * A KET NEVESITETT ALAK. UGYANAZ A MECHANIZMUS, KET KULONBOZO LISTA.
 *
 * Nem egy fuggveny "valtozatai", hanem ket kulon dolog: egy termeknek lehet
 * hasonloja kiegeszito nelkul es forditva. Az iro oldal ugyanigy KET kulon
 * konstanst tart (`MEDUSA_SIMILAR_IDS_KEY` es `MEDUSA_ACCESSORY_IDS_KEY`), es
 * ott a megjegyzes kulon kimondja, hogy ez szandekos.
 *
 * A kozos TORZS viszont egy, mert a kiolvasas szabalyai azonosak (elvalaszto,
 * duplikatum-szures, hatar). Ha ketto lenne, az epp az "egy szabaly ket helyen"
 * alak keletkezne -- ugyanabban a fajlban.
 */
export function hasonloAzonositok(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  return kapcsolatAzonositok(metadata, HASONLO_KULCS)
}

export function kiegeszitoAzonositok(
  metadata: Record<string, unknown> | null | undefined,
): string[] {
  return kapcsolatAzonositok(metadata, KIEGESZITO_KULCS)
}

/**
 * A KERT SORRENd HELYREALLITASA -- ES EZ NEM KENYELMI LEPES.
 *
 * Merve a bolt vegpontjan (acrobot, msg_id 14892): a tobbertekes `id` szuro
 * MINDET visszaadja (negyvenes kotegig mérve, nulla hianyzoval), de a valasz
 * SORRENDJE FUGGETLEN a kert sorrendtol -- forditva megadott azonositokra
 * ugyanazt a valasz-sorrendet adta.
 *
 * A gondozott listanak van sorrendje. Ha ez a lepes kimarad, a doboz MUKODIK,
 * csak mas sorrendben -- es senki nem veszi eszre. Ezert all ra kulon allitas.
 *
 * Ami a kert azonositok kozott nincs a valaszban (torolt vagy nem publikalt
 * termek), az KIMARAD: a lista rovidebb lesz, nem lyukas.
 */
export function kertSorrendben<T extends { id: string }>(
  termekek: readonly T[],
  azonositok: readonly string[],
): T[] {
  const idSzerint = new Map(termekek.map((t) => [t.id, t]))
  const ki: T[] = []
  for (const id of azonositok) {
    const talalat = idSzerint.get(id)
    if (talalat) ki.push(talalat)
  }
  return ki
}

/**
 * MELYIK LISTABOL EPULJON A "HASONLO" DOBOZ -- ES MIERT DONTES, NEM SZURO.
 *
 * === A KET FORRAS, ES A SORREND KOZTUK (acrobot dontese, 2026-09-10) ===
 *
 *     gondozott kapcsolat   ha van `unas_similar_ids`, AZ megy, valtozatlanul
 *     legmelyebb kategoria  ha nincs, a termek sajat besorolasa adja a listat
 *
 * === MIERT NEM MOND ELLENT A 14892-ES DONTESNEK ===
 *
 * A 14892 azt tiltotta meg, hogy a doboz VALOTLANT allitson. A starter szuroje
 * nulla gyujtemenyre es nulla cimkere szurt, tehat a "Hasonlo termekek" cim
 * alatt a bolt ELSO TIZENKET TERMEKE allt, barmilyen kapcsolat nelkul. Az a
 * lista hazudott.
 *
 * A legmelyebb kategoria MAS FAJTA: valodi szukites. A lista tagjai tenyleg egy
 * csoportba tartoznak, tehat a cim igaz marad. Ugyanabbol a szabalybol
 * kovetkezik, nem felulirja.
 *
 * === A MERES, AMI A TARTALEKOT INDOKOLJA (murena, 2026-09-10) ===
 *
 * Negyven kiszolgalt termeklapbol KETTON latszott a szakasz: kb. ot szazalekon
 * van gondozott kapcsolat. A tobbin a doboz nem hianyzott -- a doboz ott volt,
 * csak nem volt mit mutatnia.
 *
 * Es a tartalek a kockazatos csoportban is ad talalatot: huszonot mert termek
 * tiz kategoriaban, a legkisebb kategoria HAROM elemu (`sps---wysiwyg`, a
 * WYSIWYG korallok), tehat ott ket hasonlo jon -- mind a ketto masik egyedi
 * peldany, nem ugyanennek az allatnak a tovabbi kepe.
 *
 * === AMIT EZ A FUGGVENY NEM DONT EL ===
 *
 * Azt, hogy a doboz LATSZIK-e. Egy egyelemu kategoria (csak maga a termek)
 * ures listat ad a szures utan, es akkor a hivo `null`-t ad vissza -- nulla
 * hasonlo nem ures doboz, hanem hianyzo szakasz. Ez a lepes a hivo oldalan
 * all, mert csak a VALASZ ismereteben dontheto el.
 */
export type HasonloForras =
  | { mod: "gondozott"; azonositok: string[] }
  | { mod: "kategoria"; kategoriaId: string }
  | { mod: "nincs" }

export function kapcsolatForras(
  kapcsolat: "hasonlo" | "kiegeszito",
  metadata: Record<string, unknown> | null | undefined,
  tartalekKategoriaId?: string | null,
): HasonloForras {
  const azonositok =
    kapcsolat === "kiegeszito"
      ? kiegeszitoAzonositok(metadata)
      : hasonloAzonositok(metadata)

  if (azonositok.length > 0) {
    return { mod: "gondozott", azonositok }
  }

  /*
    A KIEGESZITO LISTA NEM KAP TARTALEKOT, ES EZ NEM FELEDEKENYSEG.

    Egy kategoria tagjai nem "kellenek hozza" egymashoz -- egy algakaparo
    melle nem tartozek egy masik algakaparo. Ott a cim VALOTLAN lenne, tehat
    pontosan az a hiba keletkezne, amit a 14892 megszuntetett.

    Ezert all a ket ag EGY fuggvenyben: kulon irva a kovetkezo olvaso
    ugyanugy "kiegesziteni" fogja a masikat is, mert szimmetrikusnak latszik.
  */
  if (kapcsolat === "hasonlo" && tartalekKategoriaId) {
    return { mod: "kategoria", kategoriaId: tartalekKategoriaId }
  }

  return { mod: "nincs" }
}
