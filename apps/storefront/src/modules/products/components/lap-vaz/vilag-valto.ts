import { HttpTypes } from "@medusajs/types"

import type { Vilag } from "./index"

/**
 * MELYIK VILAGOT KAPJA EGY TERMEK -- ES MIERT A KATEGORIA-FA DONT.
 *
 * Balazs dontese (acrobot atadasaban, 2026-09-07): "a korallokhoz a 2a valo ami
 * ek sotetek a szinei". Vagyis a valto a TERMEK FAJTAJA, nem izles es nem a
 * latogato beallitasa.
 *
 * === MIERT NEM A unique_piece JELZO, HOLOTT MA UGYANAZT ADNA ===
 *
 * A stage 21 termekebol harom all a Korallok alatt, es PONTOSAN ugyanaz a harom
 * viseli a unique_piece jelzot. A ket jel ma egyezik -- es epp ezert veszelyes.
 *
 * A JELENTESUK kulonbozik: a unique_piece "egyedi peldany", ami az elo allatok
 * RESZHALMAZA. Egy korall, amibol tobb darab van ugyanabbol a fragbol, ELO
 * ALLAT, es a jelzo a VILAGOS lapra kuldene. Ma azert egyeznek, mert a teszt
 * bolt egyetlen elo allata egyben egyedi peldany is.
 *
 * Ugyanaz a proxy-csapda, amit murena nevezett meg az `allow_backorder`-nel: a
 * jel ma helyes eredmenyt ad, es nem azt jelenti, amit mondani akarunk.
 *
 * === A KET AG, AMI EGYELORE VILAGOS, ES A FELTETEL, AMI MEGFORDITJA ===
 *
 * Merve 2026-09-07-en, a stage Store API-jan:
 *
 *   Edesvizi akvarisztika   4 alkategoria,  0 TERMEK a teljes reszfa alatt
 *   Shop 'n the Shop        0 alkategoria,  0 TERMEK
 *
 * Ma tehat EGYIK SEM valt ki semmit, es egy dontes, ami ma nem valt ki semmit,
 * nem surgos. Ezert vilagosak.
 *
 * A FELTETEL, AMI MEGFORDITJA: ha valaha ELO ALLAT kerul barmelyik ala, az az ag
 * is sotet lesz. Ez nem "majd megnezzuk", hanem megnevezett esemeny, amit a
 * kovetkezo ember fel tud ismerni -- es a ket nulla mondja meg, mibol kovetkezett.
 *
 * === MIND A HAROM AG VALODI ADATON ALL (2026-09-08) ===
 *
 * Itt 2026-09-08-ig az allt, hogy a Halak es a Gerinctelenek alatt SZINTEN
 * NULLA termek van, tehat a sotet vilagot egyedul a Korallok harom termeke
 * valtja ki. Az a mondat a teljes migracio ELOTT kelt, es ma mar hamis.
 *
 * Merve a bolt vegpontjanak teljes valaszan (mind az 1492 termek), a JAVITOTT
 * predikatummal:
 *
 *   Korallok          8
 *   Halak           125
 *   Gerinctelenek    28
 *   ---------------------
 *   osszesen        161 KULON termek (ellenorizve, hogy egy sem szamit ketszer)
 *
 * A regi predikatum ugyanezen az adaton 160-at ad. A kulonbseg az az EGY
 * termek, amit a leveles kategoria-alak a rossz vilagba sorolt.
 *
 * A MERES HATARA, ES EZ HAROM KULON DOLOG:
 *
 *   1. A szam a JAVITAS VARHATO eredmenye, nem a megepitett lape. A javitas a
 *      fo agon van, a teszt kirakat a meres pillanataban meg nem kapta meg.
 *   2. A meres acroboté: a bolt vegpontjahoz kulcs kell, ami nincs nalam. En a
 *      MECHANIZMUST mertem kodbol, o a SZAMOT az adaton.
 *
 *      EZ A KORLAT 2026-09-08 06:20-RA LEJART, ES A SZAMOK AZOTA FUGGETLENUL
 *      IGAZOLVA VANNAK. A teszt bolt publikalhato kulcsa bekerult az
 *      `exchange` konyvtarba, tehat a `medusa-stage.sh` nekem is fut. Merve,
 *      mind az 1492 termeken:
 *
 *        Korallok 8 | Halak 125 | Gerinctelenek 28 | KULON 161
 *
 *      EGY MELLEKLELET, AMI NEM VOLT A KERDESBEN: pontosan EGY termek all a
 *      boltban KATEGORIA NELKUL. A mai predikatum azt a VILAGOS lapra kuldi
 *      (nincs elo allat gyokere), ami a biztonsagos irany -- de ha valaha
 *      elo allat kerul be kategoria nelkul, csendben a rossz lapot kapja.
 *
 *      Beture ugyanaz. ES MAS UTON: en a `parent_category_id` lancan setaltam
 *      fel a gyokerig, nem az `mpath` elso szegmensebol. Ket kulonbozo
 *      feloldas, ket kulonbozo mero, ugyanaz a szam.
 *
 *      A nyers osszeg is 161, tehat egyetlen termek sem szamit ketszer (nincs
 *      olyan, ami ket elo allat gyoker ala is beesne).
 *   3. A meres CSAK az `mpath` elso szegmenset hasznalta. A masik ag (a
 *      `parent_category_id` lancan felfele) ezekben a szamokban NEM szerepel --
 *      es merve NEM IS SZAMIT MA: a bolt valaszaban nulla olyan kategoria all,
 *      aminek hianyzik az `mpath`-ja.
 *
 * A HARMADIK PONTHOZ EGY PONTOSITAS, A FENTI FUGGETLEN MERESBOL: az a meres
 * VEGIG a szulo-lancot hasznalta, es ugyanazt a 161-et adta. Vagyis a ket
 * feloldas a mai adaton EGYETERT.
 *
 * AMIT EZ NEM BIZONYIT, es a kulonbseg szamit: nem azt, hogy a tartalek ag a
 * FUTO alkalmazasban elsul. Ott csak akkor kerul sorra, ha egy kategoriabol
 * HIANYZIK az `mpath` -- es ilyen ma nulla van. A ket allitas tehat: a
 * mechanizmus HELYES (most mar adaton is), de a kodban levo agat a mai bolt
 * nem jarja be.
 *
 * A HARMADIK PONTBOL NEM AZ KOVETKEZIK, HOGY AZ AZ AG FOLOSLEGES, hanem hogy a
 * mai adat nem igazolja es nem is cafolja azt, hogy VALAHA szukseg lesz ra. Ha valaha bekerul egy ilyen alak,
 * csendben fog dolgozni -- ezert all rajta allitas ("mpath nelkul a szulo-
 * lancon talalja meg a gyokeret"), kulonben senki nem venne eszre, ha elromlik.
 */

/**
 * A HAROM ELO ALLAT GYOKER NEVE.
 *
 * NEVRE es nem azonositora: a kategoria-azonositok a vetites minden ujraepitesenel
 * mas ULID-ot kapnak (a mai `pcat_01M1PAM...` sorozat 2026-09-04-en keletkezett),
 * a nevek viszont a forras-katalogusbol jonnek es stabilak. Egy beegetett
 * azonosito a kovetkezo teljes ujravetitesnel CSENDBEN elavulna: a valto nem
 * hibazna, csak minden termeket vilagosnak mondana.
 */
/**
 * === HOL LAKIK MEG UGYANEZ A KERDES: NEGY HELY, KET REPO ===
 *
 * Az "elo allat-e ez a termek" (es a rokona, az "egyedi darab-e") kerdesre MA
 * NEGY kulonbozo szabaly valaszol, ket kulon repoban. Kozos konstanst nem lehet
 * megosztani kozottuk, ezert a szerzodes CSAK KIMONDVA letezik:
 *
 *   acropora-os / medusa-wysiwyg.policy.ts
 *       a "WYSIWYG" kategoria RESZFAJA -> egyedi darab (rendelhetoseg, jelzo)
 *
 *   acropora-os / medusa-livestock.policy.ts
 *       a HAROM ELO ALLAT GYOKER (Korallok, Halak, Gerinctelenek)
 *       -> bolti atvetel (pickup_only)
 *
 *   acropora-commerce / modules/products/components/lap-vaz/vilag-valto.ts
 *       UGYANAZ A HAROM NEV -> a kirakat sotet-vilagos valtoja
 *
 *   acropora-commerce / workflows/utils/livestock.ts
 *       termek-TIPUS azonositok egy kornyezeti valtozobol (MA URES)
 *       -> a szallitasi osztaly livestock-aga
 *
 * A KETTO, AMI EGYUTT MOZOG: a masodik es a harmadik UGYANAZT a harom nevet
 * tartalmazza, ket kulon repoban. Ha az egyik valtozik, a masikat AT KELL
 * NEZNI -- kulonben az egyik oldal mar elo allatnak tart valamit, amit a masik
 * nem, es a kulonbseg sehol nem hasal el.
 *
 * (acrobot kerese, 2026-09-07. A negyedik hely aznap este keletkezett, ezert az
 * o listajaban meg harom szerepelt.)
 */
export const ELO_ALLAT_GYOKEREK = [
  "Korallok",
  "Halak",
  "Gerinctelenek",
] as const

type Kategoria = {
  id?: string | null
  name?: string | null
  mpath?: string | null
  parent_category_id?: string | null
}

/**
 * A GYOKER a termek kategoria-listajabol: az az elem, aminek az `mpath`-ja
 * egyetlen szegmensbol all.
 *
 * A HIANYZO `mpath` NEM GYOKER, es ez egy sajat hiba javitasa. A regi feltetel
 * csak a szegmensek szamat nezte, es egy hianyzo `mpath`-bol ures sztring lesz,
 * abbol pedig `[""]` -- vagyis EGY szegmens. Egy kategoria, ami nem hozott
 * `mpath`-ot, igy GYOKERKENT viselkedett, a sajat neven.
 *
 * Ket kart okozott. Egy: egy tetszoleges melysegu kategoria neve gyokernek
 * szamitott. Ketto (es ez vezetett ide): mivel a lista igy NEM volt ures, a
 * katalogusbol valo feloldas el sem indult.
 *
 * A sajat uj allitasom fogta meg, meg a beadas elott: a szulo-lancos eset
 * pirosra valt, mert idaig el sem jutott.
 */
function gyokerNevek(katok: Kategoria[]): string[] {
  return katok
    .filter((k) => {
      const utvonal = (k.mpath ?? "").split(".").filter(Boolean)
      return utvonal.length === 1
    })
    .map((k) => (k.name ?? "").trim())
    .filter(Boolean)
}

/**
 * A GYOKER NEVE A KATALOGUSBOL, HA A TERMEK NEM HOZTA MAGAVAL.
 *
 * Az `mpath` szegmensei kategoria-AZONOSITOK, tehat az elso szegmens a gyoker
 * azonositoja. Nevet csak a teljes kategoria-lista tud adni ra -- azt a lap
 * amugy is lekeri (`listCategories({ fields: "id,name,handle,
 * parent_category_id" })`), es atadja a sablonnak.
 *
 * Ha `mpath` sincs, a `parent_category_id` lancan megyunk felfele. A korokre
 * van halo: legfeljebb annyi lepes, ahany kategoria van.
 */
function gyokerNevKatalogusbol(
  katok: Kategoria[],
  katalogus: Kategoria[],
): string[] {
  if (katalogus.length === 0) return []

  const nevAzonositora = new Map<string, string>()
  const szuloAzonositora = new Map<string, string | null>()
  for (const k of katalogus) {
    if (!k.id) continue
    nevAzonositora.set(k.id, (k.name ?? "").trim())
    szuloAzonositora.set(k.id, k.parent_category_id ?? null)
  }

  const nevek: string[] = []
  for (const k of katok) {
    const utvonal = (k.mpath ?? "").split(".").filter(Boolean)
    let gyokerAzonosito = utvonal[0]

    if (!gyokerAzonosito && k.id) {
      let mostani: string | null = k.id
      for (let lepes = 0; lepes <= katalogus.length && mostani; lepes += 1) {
        const szulo: string | null = szuloAzonositora.get(mostani) ?? null
        if (!szulo) break
        mostani = szulo
      }
      gyokerAzonosito = mostani ?? undefined
    }

    const nev = gyokerAzonosito
      ? nevAzonositora.get(gyokerAzonosito)
      : undefined
    if (nev) nevek.push(nev)
  }
  return nevek
}

/**
 * === MIERT KELL A KATALOGUS, ES MIT ROMLOTT EL NELKULE ===
 *
 * A fenti `gyokerNevek` abbol indult ki, hogy "a Medusa minden ost is felsorol
 * a termek kategoriai kozott, tehat a gyoker ott van a listaban". EZ NEM IGAZ
 * MINDIG, es merve van az elo API-n (2026-09-07, a `valodi-tartalom.spec`
 * rogziti): az egyik termek HAT kategoriat kapott a gyokerrel egyutt, egy masik
 * CSAK EGYET -- a levelet, HAROM szintu `mpath`-tal, szulo nelkul.
 *
 * A MELYSEG VISZONT NEM SZAMIT, ES EZT KULON KI KELL MONDANI. A fenti harom
 * szintu pelda egy MUSZAKI termek volt (Hanna fotometerek, `c1.c7.c9`). Az
 * egyetlen elo allat, amit ez a hiba ma erint, KET szegmensu:
 *
 *   periclimenes-brevicarpalis-anemona-garnela-par-him
 *   egyetlen kategoriaja: "Rakok, Garnelak - Gerinctelenek",
 *   aminek a szuloje MAGA a Gerinctelenek gyoker
 *   (acrobot merese a teszt bolton, 2026-09-08 03:02. A zarojelben itt az allt,
 *   hogy "nala van a kulcs" -- ez 2026-09-08 06:20-ra MEGSZUNT: a teszt bolt
 *   PUBLIKALHATO kulcsa bekerult az `exchange` konyvtarba, tehat a
 *   `medusa-stage.sh` barmelyikunknek fut, es van `query` aga tetszoleges
 *   /store lekerdezesre. Ugyanezt a szamot azota en is visszamertem.)
 *
 * Vagyis a feltetel NEM az, hogy harom szintu az `mpath`, hanem hogy nincs
 * benne EGYSZEGMENSU elem. Ket szinttol felfele barmelyik melyseg ilyen, es a
 * javitas (az elso szegmens) mindegyiket ugyanugy oldja meg.
 *
 * Ezt azert kell kiirni, mert a harom szintu pelda konnyen olvasodik
 * FELTETELKENT -- es akkor a kovetkezo olvaso egy ket szintu esetnel azt
 * hinne, hogy az mas hiba.
 *
 * A leveles alaknal nincs egyszegmensu elem, tehat `gyokerNevek` URESET ad, es
 * a termek VILAGOS lesz. Egy elo allat igy csendben a muszaki elrendezest kapja
 * -- es mivel a `galeriatAdunkAt` UGYANEZEN a fuggvenyen all, a JELVENYT es az
 * IGERETET is elveszti, vagyis pont azt, aminek a megorzesere a #89 es a #91
 * epult.
 *
 * A LENYOMATA EGY SZAMBAN: acrobot a Gerinctelenek gyoker alatt 28 termeket mert
 * (adminban ES a boltban is), en ugyanarra a valaszra a valtot futtatva 27-et.
 * A hianyzo egy nem tunt el, hanem rossz vilagba sorolodott.
 *
 * A KATALOGUS NEM UJ LEKERDEZES: a termeklap mar ma is lekeri es atadja.
 */
export function vilagaTermeknek(
  termek: Pick<HttpTypes.StoreProduct, "categories"> | null | undefined,
  katalogus: Kategoria[] = [],
): Vilag {
  const katok = (termek?.categories ?? []) as Kategoria[]

  const gyokerek = gyokerNevek(katok)
  const nevek =
    gyokerek.length > 0 ? gyokerek : gyokerNevKatalogusbol(katok, katalogus)

  const eloAllat = nevek.some((nev) =>
    (ELO_ALLAT_GYOKEREK as readonly string[]).includes(nev),
  )

  return eloAllat ? "sotet" : "vilagos"
}
