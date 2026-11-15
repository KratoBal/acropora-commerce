import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { sqlFeltetelek } from "./kereses-sql";
import { keresesiTerv } from "./kereses-terv";

/**
 * EKEZET-FUGGETLEN TERMEKKERESES -- CSAK AZONOSITOKAT AD VISSZA.
 *
 * === MIERT VAN EZ AZ UTVONAL, ES MIERT NEM A KIRAKATBAN JAVITOTTUK ===
 *
 * A kirakat a Medusa `q` parameteret hasznalja, a mag abbol `ILIKE '%token%'`
 * feltetelt epit, a Postgres ILIKE pedig az ekezetet NEM vonja ossze. Az adat
 * ekezetes, a vevo ekezet nelkul gepel -- es a kirakat csak a KERDEST latja.
 * Ha ott szednenk le az ekezetet, az ekezetes keresesek vesznenek el.
 * Osszehasonlitaskor MIND A KET oldalt egy alakra kell hozni, es a tarolt
 * oldalhoz SQL kell.
 *
 * acrobot dontese (2026-09-14): sajat vegpont, ami CSAK a talalati
 * azonositokat adja vissza; a termekeket a kirakat a MAI uton keri le. Igy a
 * lapozas, a szures es az arazas EGY helyen marad -- egy masodik teljes
 * listazo ut ketto lenne beloluk, es a ketto elcsuszna.
 *
 * === EZ AZ ELSO NYERS SQL EBBEN A BACKENDBEN, ES EZT KIMONDOM ===
 *
 * Merve: a `PG_CONNECTION` kulcsra ma nulla hivo van a fankban. Egy nyers
 * lekerdezes megkeruli a modul-hatarokat, amiket a Medusa kulonben betartat --
 * ezert a hatokore SZANDEKOSAN a legszukebb, amit a feladat enged:
 *
 *   OLVAS, es semmi mast            egyetlen SELECT, nincs iras
 *   a termek-modul SAJAT tablait    `product`, `product_variant`
 *   CSAK azonositot ad vissza       nincs mezo-lekepezes, ami elcsuszhatna
 *                                   a modul alakjatol egy frissitesnel
 *   parameterezve                   a keresett szoveg SOHA nem kerul a
 *                                   lekerdezes szovegebe
 *
 * Ha a Medusa valaha ekezet-fuggetlen keresest ad, ez az utvonal TORLENDO, nem
 * bovitendo.
 *
 * === MIT KERES, ES MIERT EPP EZT ===
 *
 * Ugyanazokat a mezoket, amiket a mag `q`-ja: a termek `title`, `subtitle`,
 * `description` mezojet (ezek a `.searchable()` jelolesuek a modellben), es a
 * valtozatok `sku` erteket. A SKU ASCII, tehat ekezet-szempontbol kozombos --
 * DE ha kihagynank, a mai viselkedes romlana: a `q=DMBS1KG` kereses ma
 * megtalalja a termeket a cikkszamabol (merve 2026-09-08).
 *
 * A szavakat ES-sel kotjuk, ahogy a mag is: `q=kek lampa` mind a kettot keresi.
 *
 * SZINONIMAK, ROVIDITESEK, TOALAK (V4.1, 2026-11-04): a szavakbol egy terv lesz
 * (`kereses-terv.ts`): egy csoport-tag a csoport barmelyik tagjara illeszkedik
 * (lehabzó = skimmer = fehérje lefölöző ...), a rovidites (KH, ATO, Ca) csak
 * kulon szokent, es a gyakori magyar toldalek lekerul (lehabzók -> lehabz). Az
 * SQL-t a `kereses-sql.ts` epiti, ugyanazokra a mezokre.
 *
 * === A FELSO HATAR, ES AMI KOZBEN VALTOZOTT (kartya 30b376de, 2026-11-15) ===
 *
 * A talalati lista a kirakatba azonositokent megy vissza, es a kirakat a
 * termekeket KICSI csomagokban kerdezi le `id` szuroval (egy kereses egy csomagja
 * legfeljebb szaz azonosito, a lap pedig csak a sajat tizennyolc termekeit kerdezi), tehat az
 * azonositok SZAMA nem jut egy hosszu lekerdezes cimebe. Ezert a hatar nem ket-
 * szaz: egy VEDELEM a valasz merete ellen (3000 azonosito nagyjabol 100 KB JSON), nem a cim hossza.
 *
 * Korabban EGYETLEN `id` szuro vitte az osszes azonositot a lekerdezes cimebe
 * (200 azonosito nagyjabol hat kilobajt, a szokasos nyolc kilobajtos korlat alatt), es ezert
 * volt a hatar 200. A kovetkezmeny: a regebbi talalatok kiestek, es az ar szerinti rendezes
 * csak a 200 LEGUJABBAT rendezte. Merve a teszt boltban a javitas elott (2026-11-15): `q=szűrő` 200,
 * `q=só` 200 azonositot adott vissza (a valodi talalatszam 241 vagy tobb).
 *
 * A VALASZ KIMONDJA, HA MEGIS LEVAGTUK (`csonkolt`), es a kirakat ezt kiirja a
 * vevonek. A mai katalogus 1501 termek, tehat a 3000 nem egy kereses talalatszama,
 * hanem a hatar, amit egy katalogus-novekedes ervenytelenit.
 *
 * === KET DOLOG, AMIT SZANDEKOSAN NEM JAVITUNK, ES EZERT ALL ITT ===
 *
 * 1. A LIKE JOKEREI NINCSENEK VEDVE. Aki `%` vagy `_` karaktert gepel, jokert
 *    kap: a `q=50%` mintabol `%50%%` lesz. EZ NEM ROMLAS -- a Medusa mag `q`-ja
 *    pontosan ugyanezt csinalja (`%${searchValue}%`, vedes nelkul), tehat a mai
 *    viselkedest orizzuk. Azert all itt, hogy ha valaha panasz jon ra, senki ne
 *    higgye, hogy az UJ ut hozta. (acrobot atnezese, 2026-09-14.)
 *
 * 2. AZ INDEX KERDESE, ES ITT A KEZENFEKVO VALASZ ROSSZ. A
 *    `translate(lower(oszlop), ...)` feltetelt egy sima index nem szolgalja ki,
 *    tehat minden kereses vegigolvassa a tablat. 1501 terméknel ez nem latszik.
 *    DE EGY KIFEJEZES-INDEX SEM OLDANA MEG: a minta `%`-szal KEZDODIK, es azt a
 *    btree ugyis eldobja. Ha ez valaha lassu lesz, a valodi ut a `pg_trgm` GIN
 *    index -- az viszont BOVITMENY, tehat ugyanaz a merlegeles, amit az
 *    `unaccent`-nel elvetettunk.
 *
 *    EZT AZERT IRJUK LE, hogy ha egyszer lassu lesz, senki ne toltson egy
 *    delelottot egy indexszel, ami nem segit.
 */
const FELSO_HATAR = 3000;

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const nyers = (req.query.q ?? "") as string | string[];
  const kifejezes = Array.isArray(nyers) ? (nyers[0] ?? "") : nyers;
  const terv = keresesiTerv(kifejezes);

  // URES KERESES URES VALASZ, es NEM "minden termek": a hivo maga dont arrol,
  // mit mutat ures keresesre, es ma a teljes listat mutatja -- ha ide
  // mindent visszaadnank, ugyanazt a dontest egy masodik helyen is meghoznank.
  if (terv.length === 0) {
    res.json({ ids: [], count: 0, csonkolt: false });
    return;
  }

  const kapcsolat = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);
  const { feltetelek, ertekek } = sqlFeltetelek(terv);

  const sql = `
    SELECT p.id
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
      AND ${feltetelek}
    ORDER BY p.created_at DESC, p.id DESC
    LIMIT ${FELSO_HATAR + 1}
  `;

  const eredmeny = await kapcsolat.raw(sql, ertekek);
  const sorok: Array<{ id: string }> = eredmeny?.rows ?? [];
  const csonkolt = sorok.length > FELSO_HATAR;

  res.json({
    ids: sorok.slice(0, FELSO_HATAR).map((sor) => sor.id),
    count: csonkolt ? FELSO_HATAR : sorok.length,
    csonkolt,
  });
};
