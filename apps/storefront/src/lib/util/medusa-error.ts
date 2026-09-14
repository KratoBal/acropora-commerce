import { hibaAllapota } from "./kedvezmeny-uzenet"

/**
 * A MEDUSA-HIVASOK HIBAJANAK EGYSEGES ALAKJA.
 *
 * === A MERT HIBA (860b273a) ===
 *
 * Ez a seged `err.response.status` alakot vart -- az a REGI, axios-alapu
 * kliens alakja. A mai `@medusajs/js-sdk` `FetchError`-t dob, aminek `status`
 * mezoje van es `response` NINCS (merve a csomagban: `client.js`,
 * `new FetchError(message, statusText, status)`).
 *
 * Vagyis MINDEN hiba a harmadik, `else` agra esett -- arra, ami a "nem is jott
 * valasz" esetre keszult --, es a `console.error` diagnosztika (Resource,
 * Status, Headers) SOHA nem futott le.
 *
 * ES EZ NEM KODOLVASASBOL VALO KOVETKEZTETES. A teszt kirakat naplojaban all a
 * bizonyitek (2026-09-14, digest 2352313220), szo szerint:
 *
 *     Error: Error setting up the request: The promotion code ... is invalid
 *
 * Az "Error setting up the request:" pontosan az `else` ag szovege volt. Egy
 * sima 4xx elutasitas tehat arra az agra esett, ami halozati hibara keszult.
 *
 * === AMIT A JAVITAS AD, ES AMIT NEM ===
 *
 * AD: a naplo mostantol TUDJA az allapotkodot es a szerver uzenetet, tehat egy
 * masnapi kerdesre ("miert utasitotta el?") van mibol valaszolni.
 *
 * NEM AD: a vevo elott semmit. Ez a seged tovabbra is DOB, es egy
 * szerver-muveletben dobott hiba uzenete a produkcios buildben nem jut el a
 * klienshez (a Next lecsereli). Az a MASIK tetel (`31a50e97`): a hivoknak
 * ertekkel kell visszaterniuk. Ezt a hatart azert mondom ki, hogy senki ne
 * higgye: ezzel a kepernyon is jobb lett.
 *
 * === AZ ALLAPOTKOD KIOLVASASA KOZOS ===
 *
 * A `hibaAllapota` mar letezik (a kedvezmenykod javitasabol), es mar ORZOTT:
 * allitas all ra, hogy a `FetchError` alakbol kiolvas, a REGI `response`-os
 * alakbol pedig NEM. Egy masodik, sajat kiolvaso itt azt jelentene, hogy
 * ugyanaz a szabaly ket helyen all -- es a ketto elcsuszna.
 */
export default function medusaError(error: unknown): never {
  const allapot = hibaAllapota(error)
  const uzenet =
    error instanceof Error ? error.message : String(error ?? "ismeretlen hiba")

  if (allapot !== undefined) {
    /*
      A DIAGNOSZTIKA MOSTANTOL TENYLEG LEFUT. A ket sor kulon all, mert a
      naploban kulon is kereshető: az allapotkod a MI oldalunkat mondja meg
      (jol kerdeztunk-e), az uzenet a MEDUSA valaszat.
    */
    console.error("Medusa hívás elutasítva, státusz:", allapot)
    console.error("Medusa válasz:", uzenet)

    // A NAGY KEZDOBETU ES A PONT a regi viselkedes, es szandekosan marad: a
    // hivok egy resze ezt a szoveget adja tovabb, es egy formazasi valtozas
    // ott latszana, ahol nem ez a tetel targya.
    throw new Error(uzenet.charAt(0).toUpperCase() + uzenet.slice(1) + ".")
  }

  /*
    ALLAPOTKOD NELKUL: halozati hiba, megszakadt kapcsolat, vagy valami, ami nem
    is a Medusatol jott. A KULONBSEG SZAMIT: statusszal a szerver VALASZOLT es
    elutasitott; nelkule EL SEM JUTOTTUNK hozza. A ket eset mas teendot ad annak,
    aki a naplot olvassa.
  */
  console.error("Medusa hívás válasz nélkül maradt:", uzenet)
  throw new Error("A háttérszolgáltatás nem válaszolt: " + uzenet)
}
