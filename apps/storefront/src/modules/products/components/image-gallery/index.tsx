import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"

import UniquePieceBadge, {
  UniquePiecePromise,
} from "@modules/products/components/unique-piece-badge"

import { KEP_ARANY, TovabbiKepek } from "./kep-meret"

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
const ImageGallery = ({ images, uniquePiece = false }: ImageGalleryProps) => {
  const [nagy, ...tobbi] = images

  return (
    <div className="flex items-start relative">
      <div className="flex flex-col flex-1 gap-y-4">
        {nagy && (
          <Container
            key={nagy.id}
            className="relative w-full overflow-hidden bg-ui-bg-subtle"
            style={{ aspectRatio: KEP_ARANY }}
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
                style={{
                  objectFit: "cover",
                }}
              />
            )}
          </Container>
        )}

        <TovabbiKepek kepek={tobbi} />
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
