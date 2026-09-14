import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import { oszlopHajtogatva, szavakra } from "./ekezet-hajtogatas";

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
 * === A FELSO HATAR, ES AMI ROSSZ LENNE NELKULE ===
 *
 * A talalati lista a kirakatba mint `id` szuro megy vissza, vagyis a
 * lekerdezes CIMEBE. Egy tulsagosan hosszu cim a kiszolgalonal elhasalna --
 * ezert a lista korlatos, es a valasz KIMONDJA, ha levagtuk (`csonkolt`).
 * A hatar nem izles: 200 azonosito nagyjabol hat kilobajt cim, ami a szokasos
 * nyolc kilobajtos korlat alatt marad.
 *
 * ES A CSONKOLAS NEM NEMA -- A VALASZBAN. A `csonkolt` mezo ott van; a kirakat
 * ma NEM rajzolja ki, es a vevo fele igy a levagas NEMA MARAD. Merve a
 * kitelepites utan: a `szűrő` kereses 241-252 talalatrol 193-204-re esett, azaz
 * pontosan 200 azonositora -- a vevo legalabb 41 termeket nem lat, es a lapozo
 * egyszeruen 17 lapot mutat.
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
const FELSO_HATAR = 200;

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const nyers = (req.query.q ?? "") as string | string[];
  const kifejezes = Array.isArray(nyers) ? (nyers[0] ?? "") : nyers;
  const szavak = szavakra(kifejezes);

  // URES KERESES URES VALASZ, es NEM "minden termek": a hivo maga dont arrol,
  // mit mutat ures keresesre, es ma a teljes listat mutatja -- ha ide
  // mindent visszaadnank, ugyanazt a dontest egy masodik helyen is meghoznank.
  if (szavak.length === 0) {
    res.json({ ids: [], count: 0, csonkolt: false });
    return;
  }

  const kapcsolat = req.scope.resolve(ContainerRegistrationKeys.PG_CONNECTION);

  const feltetelek: string[] = [];
  const ertekek: string[] = [];
  for (const szo of szavak) {
    // A `?` helyorzokbe MENNEK az ertekek; a szoveg sosem kerul a lekerdezesbe.
    feltetelek.push(`(
      ${oszlopHajtogatva("p.title")} LIKE ?
      OR ${oszlopHajtogatva("coalesce(p.subtitle, '')")} LIKE ?
      OR ${oszlopHajtogatva("coalesce(p.description, '')")} LIKE ?
      OR EXISTS (
        SELECT 1 FROM product_variant v
        WHERE v.product_id = p.id
          AND v.deleted_at IS NULL
          AND ${oszlopHajtogatva("coalesce(v.sku, '')")} LIKE ?
      )
    )`);
    const minta = `%${szo}%`;
    ertekek.push(minta, minta, minta, minta);
  }

  const sql = `
    SELECT p.id
    FROM product p
    WHERE p.deleted_at IS NULL
      AND p.status = 'published'
      AND ${feltetelek.join(" AND ")}
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
