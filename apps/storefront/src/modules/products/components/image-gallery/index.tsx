"use client"

import { useState } from "react"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"

import UniquePieceBadge, {
  UniquePiecePromise,
} from "@modules/products/components/unique-piece-badge"

import { KEP_ARANY_OSZTALY, TovabbiKepek } from "./kep-meret"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /**
   * EGY DARAB, EZ A KONKRÉT PÉLDÁNY -- A KÉPEN.
   *
   * A jelvény CSAK az első képre kerül. Minden képre kitéve nem ígéret lenne,
   * hanem díszítés, és a lefelé görgető vevő ugyanazt olvasná ötször.
   */
  uniquePiece?: boolean
}

/**
 * A NAGY KEP KISEBB LETT, A TOBBI ALA KERULT, KICSIBEN.
 *
 * ITT KORABBAN MINDEN KEP TELJES SZELESSEGGEL, EGYMAS ALATT ALLT. Egy
 * harom kepes elo allatnal ez harom, egyenkent 814 pixel magas dobozt jelentett
 * a 456 pixeles panel mellett. Balazs kerese: "a kep meretezese? a tobbi kep a
 * nagy kep ala kicsiben?"
 *
 * A szam es a mobil viselkedes indoklasa a `kep-meret.tsx` fajlban all, mert
 * a MASIK kep-ut (a technikai termekek `Foto` komponense) ugyanazt hasznalja.
 */
/**
 * A BOLYEGKEP-SOR CSERELI A NAGY KEPET.
 *
 * === MIERT KLIENS KOMPONENS ===
 *
 * A valasztas ALLAPOT, es a nagy kep meg a sor UGYANAZT az allapotot olvassa.
 * Egy szerver komponens nem tud fuggvenyt atadni a sornak, tehat a ketto
 * kozott nem lenne kapcsolat -- pontosan ezert allt a sor 2026-09-09-ig
 * HOLTAN, azon a napon, amikor megepitettem.
 *
 * A propok szerializalhatok (kep-objektumok es egy logikai ertek), tehat a
 * hataron atmennek.
 *
 * === MIERT AZ EGESZ KESZLET ALL A SORBAN, NEM A TOBBI ===
 *
 * Eddig a sor a nagy kep NELKULI maradekot mutatta. A tervlapon a sorban HAT
 * csempe all, es az ELSO 2 pixeles rez keretet visel -- vagyis a sor a TELJES
 * keszlet, es a kivalasztott meg van jelolve benne. Egy csempe, ami eltunik,
 * amikor ranyomsz, a valasztast is elrejti.
 *
 * === ES A MASIK KEP-UT EGYELORE NEM VALTOZIK ===
 *
 * A technikai lapok a `lap-vaz/valodi-tartalom.tsx` `Foto` komponensen mennek
 * (merve 2026-09-09 a kitelepitett lapon: a korall lapon `nagy-kep`, a
 * muszaki es adalek lapokon `vaz-foto`). Ott a nagy kep sima `<img>`, itt
 * `next/image` -- a ket ut EGYESITESE azt jelentene, hogy az egyik oldal
 * kep-megjelenitese megvaltozik, es azt NEM ez a kor donti el. Kulon tetel,
 * es addig a technikai lapokon a sor nem kattinthato.
 */
const ImageGallery = ({ images, uniquePiece = false }: ImageGalleryProps) => {
  const [kivalasztott, setKivalasztott] = useState(0)
  const nagy = images[kivalasztott] ?? images[0]

  return (
    <div className="flex items-start relative">
      <div className="flex flex-col flex-1 gap-y-4">
        {nagy && (
          <div
            key={nagy.id}
            className={`relative w-full overflow-hidden ${KEP_ARANY_OSZTALY}`}
            /*
            SIMA `div`, NEM A KOZOS `Container` -- ES EZT MERES KERTE.

            A `Container` komponensunk BEEGETVE viszi a `bg-white rounded-lg
            p-4` osztalyokat. A kep-doboznal mind a harom felesleges vagy
            karos, es a hatasuk KULONBOZIK -- ezert nem eleg egyet kivenni:

              rounded-lg   LATSZIK: 8 pixeles lekerekites all a foton, es a
                           tervlapon a foto doboza `position:relative;
                           aspect-ratio:16/10; background:...` -- lekerekites
                           NINCS rajta. (Merve a kitelepitett lapon: a
                           szamitott `border-radius` 8px volt.)
              p-4          NEM LATSZIK: a `next/image` `fill` modban
                           abszolut pozicioval all, tehat a belso margot
                           atlepi. Merve: a doboz 822x514, a kep 822x514,
                           bal+0 jobb+0.
              bg-white     NEM LATSZIK: a beagyazott `background` felulirja.
                           Merve: a szamitott hatter a sotet lapon
                           `oklch(0.17 0.016 250)`, vagyis a lap foldje.

            A ket LATHATATLAN osztaly nem artalmatlan: amig ott allnak, egy
            tagadas, ami rogzitett hattereket tilt, NEM irhato meg -- azonnal
            pirosat adna egy helyes fan. Ez a valtozas ezert nem csak egy
            lekerekitest vesz le, hanem KINYITJA a mérhetőséget is (kartya
            `c9d3cec8`).
            */
            /*
              A DOBOZ FOLDJE A LAP FOLDJE, NEM EGY ROGZITETT SZURKE.

              `contain` mellett a foto MELLETT (vagy alatta) sav marad, ha az
              aranya nem 16:10. Ha az a sav rogzitett szinu, a SOTET lapon
              vilagos csik allna a foto ket oldalan, es a kep elrontottnak
              latszana -- holott csak kisebb.

              A lap sajat foldjen a sav LATHATATLAN: a foto egyszeruen kisebb.
              Itt korabban `bg-ui-bg-subtle` allt, ami a Medusa rogzitett
              tokenje, es nem ismeri a `data-vilag` kapcsolot.
            */
            style={{ background: "var(--terv-hatter)" }}
            id={nagy.id}
            data-testid="nagy-kep"
          >
            {uniquePiece && <UniquePieceBadge />}
            {!!nagy.url && (
              <Image
                src={nagy.url}
                priority
                className="absolute inset-0 rounded-rounded"
                /* MAGYARUL, ES EZ NEM KOZMETIKA. A regi alak
                   `alt={`Product image ${index + 1}`}` volt: ugyanugy ANGOL
                   szoveg ment ki a vevonek, csak a magyar-felirat orzo nem
                   latta, mert a szoveg egy sablon-kifejezesben allt. Ahogy
                   allando szoveg lett belole, azonnal pirosra fordult. */
                alt="Termékfotó"
                fill
                sizes="(max-width: 576px) 100vw, (max-width: 992px) 100vw, 856px"
                /*
                  A TELJES FOTO LATSZIK, NEM A 16:10-ES KIVAGASA.

                  Balazs dontese (2026-09-09 12:16:18Z, egyetlen betu: "b"),
                  harom felkinalt ut kozul. A merés, ami ele ment: hat
                  korall-fotobol a magassag 38 / 38 / 38 / 17 / 17 / 10
                  szazaleka veszett volna el `cover` mellett, es a negyzetes
                  kepeknel a telep TETEJE.

                  AZ INDOK, AMIT ELFOGADOTT: a lapunkon ott all a mondat, hogy
                  "a foto pontosan ezt a peldanyt mutatja: ezt kapod, nem egy
                  hasonlot". Ha a magassag harmada nem latszik, az a mondat nem
                  all.

                  ES AMIT EZ NEM OLD MEG: a tervlap helyorzoje "SAJÁT FOTÓ --
                  EZ A PÉLDÁNY, 16:10" -- vagyis a 16:10 a FOTOZAS bemeneti
                  kikotese, nem az, hogy a meglevo kepeket vagjuk ra. A doboz
                  aranya ezert marad 16:10; a keszlet 16:10-re hozasa
                  tartalom-munka, es kulon tetel.

                  A MASIK KEP-UT (`Foto` a `lap-vaz/valodi-tartalom.tsx`-ben)
                  MAR `contain`-t hasznalt. A ket ut eddig NEM EGYEZETT, es
                  csak az egyik hordozta a dontest.
                */
                style={{
                  objectFit: "contain",
                }}
              />
            )}
          </div>
        )}

        {/*
          EGYETLEN KEPNEL NINCS SOR, ES EZ NEM A REGI VISELKEDES MARADVANYA.

          Egy egy-csempes sor semmit nem kinal: nincs mire valtani, es a
          csempe pontosan azt mutatja, ami folotte all. A tervlapon a sor
          HAT csempet mutat -- valasztasrol szol, nem ismetlesrol.
        */}
        <TovabbiKepek
          kepek={images.length > 1 ? images : []}
          kivalasztott={kivalasztott}
          onValaszt={setKivalasztott}
        />
        {/*
          AZ ÍGÉRET-MONDAT A KÉP ALATT ÁLL, EGYSZER (picasso terve, 2026-09-07).
          A jelvény a kép sarkában, ez a galéria alatt: a kettő külön helyen, mert
          a jelvény jelöl, ez pedig magyaráz.
        */}
        {uniquePiece && <UniquePiecePromise className="mt-1" />}
      </div>
    </div>
  )
}

export default ImageGallery
