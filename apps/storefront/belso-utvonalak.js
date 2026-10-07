/**
 * A PUBLIKUS CIM -> BELSO, GYORSITOTARAZHATO UTVONAL (FE-7 3. resz, Balazs
 * 2026-10-07 07:44 UTC; a terv acrobot 27436-os jovahagyasaval).
 *
 * A Next 15-ben a `searchParams` olvasasa a lapot dinamikussa teszi
 * (`private, no-store`). A publikus cimek (`?v_id=`, `?page=`) nem valtoznak,
 * a parameter viszont BELSO utvonal-szegmens lesz, tehat a lap ISR maradhat:
 *
 *   /hu/products/h?v_id=variant_X  -> /hu/_v/variant_X/products/h
 *   /hu/categories/a/b?page=3      -> /hu/_p/3/categories/a/b
 *   /hu/categories/a?sortBy=...    -> /hu/_szurt/categories/a   (dinamikus)
 *
 * MIERT `next.config` ES NEM MIDDLEWARE: a middleware `NextResponse.rewrite`
 * Next 15.5.24-en MEGKERULI az ISR-t. Merve 2026-10-07 probaepitesen: minden
 * atirt keres ujrarenderelt (uj idobelyeg), `private, no-store`, mikozben a
 * cel-ut kozvetlenul MISS, majd HIT. A `beforeFiles` atiras ugyanott MISS,
 * majd HIT, es a mellette futo middleware (orszagkod, suti) nem zavarja.
 *
 * MIERT ELOTAG, ES NEM UTOTAG: a kategoria-ut `[...category]` gyujto
 * szegmens, utana nem allhat tovabbi szegmens.
 *
 * A SZURT LAP DINAMIKUS MARAD: a rendezes, a marka, az opcio-szuro es a
 * kereses kombinacioi korlatlanok, gyorsitotarban csak a tarat toltenek.
 * Egy ismeretlen parameter NEM visz a szurt utra: az alaplap nem olvas
 * parametert, tehat egy ismeretlen kulcs (kampany, kovetes) a tartalmat nem
 * valtoztatja, csak ugyanazt a bejegyzest kapja.
 *
 * CommonJS, mert a `next.config.js` is az; a middleware es a tesztek is innen
 * olvasnak, hogy a lista egy helyen alljon.
 */

/** Az utvonal-mappak `%5F` elotaggal allnak (`%5Fv`): az `_` elotagu mappa a Next-ben privat, nem utvonal. */
const BELSO_ELOTAGOK = ["_v", "_p", "_szurt"]

/** Amit a szurt lap olvas. Ami itt nincs, azt a lap nem is hasznalja. */
const SZURO_KULCSOK = ["sortBy", "marka", "optionValueIds", "q", "gyoker"]

/** A Medusa valtozat-azonositoja (ULID); mas ertekre nincs atiras. */
const VALTOZAT_MINTA = "variant_[0-9A-Z]{26}"

/** 2 es 9999 kozott; az 1. lap az alaplap, nem kap kulon bejegyzest. */
const LAPSZAM_MINTA = "[2-9]|[1-9][0-9]{1,3}"

const LISTAK = [
  { forras: "/:orszag/categories/:ut+", cel: "categories/:ut+" },
  { forras: "/:orszag/collections/:handle", cel: "collections/:handle" },
  { forras: "/:orszag/store", cel: "store" },
]

/**
 * A `beforeFiles` atirasok, SORRENDBEN: az elso illeszkedo nyer, tehat a
 * szuro a lapszam elott all (`?sortBy=x&page=2` a szurt lapra megy).
 */
function belsoAtirasok() {
  const szurt = LISTAK.flatMap(({ forras, cel }) =>
    SZURO_KULCSOK.map((kulcs) => ({
      source: forras,
      has: [{ type: "query", key: kulcs }],
      destination: `/:orszag/_szurt/${cel}`,
    })),
  )
  const lapozott = LISTAK.map(({ forras, cel }) => ({
    source: forras,
    has: [{ type: "query", key: "page", value: `(?<lap>${LAPSZAM_MINTA})` }],
    destination: `/:orszag/_p/:lap/${cel}`,
  }))
  const valtozat = {
    source: "/:orszag/products/:handle",
    has: [
      { type: "query", key: "v_id", value: `(?<valtozat>${VALTOZAT_MINTA})` },
    ],
    destination: "/:orszag/_v/:valtozat/products/:handle",
  }
  return [...szurt, ...lapozott, valtozat]
}

/**
 * Kivulrol hivott belso ut? A middleware az EREDETI cimet latja, az atiras
 * elott, tehat ez csak a kozvetlen hivast fogja meg: egy masodik cim ugyanarra
 * a tartalomra, es a lapszam- vagy valtozat-bejegyzesek kivulrol tolthetok
 * lennenek.
 */
function belsoUtKivulrol(pathname) {
  const masodik = pathname.split("/")[2]
  return BELSO_ELOTAGOK.includes(masodik)
}

module.exports = {
  BELSO_ELOTAGOK,
  SZURO_KULCSOK,
  VALTOZAT_MINTA,
  LAPSZAM_MINTA,
  belsoAtirasok,
  belsoUtKivulrol,
}
