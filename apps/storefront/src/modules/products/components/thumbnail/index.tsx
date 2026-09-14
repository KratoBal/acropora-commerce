import { Container, clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <Container
      className={clx(
        /**
         * A KEPDOBOZ NEGYZETES, ES A KEP BELEFER (Balazs kerese, 2026-09-14 10:30).
         *
         * === A MERT HIBA ===
         *
         * Itt korabban harom kulonbozo arany allt: 11/14 a kiemelt kartyakon,
         * 9/16 minden mas listan, 1/1 csak a `size="square"` hivoknal. A
         * `/store` lapon a 9/16 futott, es az ALLO TELEFONKEPERNYO alaku.
         * Merve az elo lapon (shop-staging, 1440 pixeles nezet, Playwright):
         * a doboz 261 x 464 pixel egy 261 pixel szeles kartyan. Ezert fert a
         * kepernyore MASFEL sor termek.
         *
         * A masik fele az `object-cover` volt (lasd lentebb): a kep BELEVAGVA
         * toltotte ki ezt a magas dobozt. Mivel minden szallitoi fotonak mas
         * az alakja, mindegyik MASHOL serult -- az AF Amino Mix dobozarol a
         * nemet es spanyol HATLAP latszott a termek helyett. Balazs szo
         * szerint ezt kifogasolta: "nagyon nagyok a kepek", "jo lenne valami
         * egyseges megjelenes".
         *
         * === MIERT EGY ARANY, ES NEM HAROM ===
         *
         * Az "egyseges megjelenes" azt jelenti, hogy a DOBOZ mindig ugyanakkora,
         * fuggetlenul attol, melyik listan all. Harom arany mellett a nyitolap
         * kiemelt sora es a kereso talalati listaja kulonbozo alaku maradt
         * volna. Ezert mind a harom helyett egy negyzet all.
         *
         * A `size` prop tovabbra is a SZELESSEGET valasztja (small/medium/
         * large/full); csak az aranyt vettuk ki a kezebol.
         */
        "relative w-full aspect-[1/1] overflow-hidden p-4 bg-ui-bg-subtle shadow-elevation-card-rest rounded-large group-hover:shadow-elevation-card-hover transition-shadow ease-in-out duration-150",
        className,
        {
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        },
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} />
    </Container>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
}: Pick<ThumbnailProps, "size"> & { image?: string }) => {
  return image ? (
    <Image
      src={image}
      alt="Thumbnail"
      /**
       * BELEFER, NEM BELEVAG (`contain`, nem `cover`).
       *
       * A `cover` a doboz rovidebb tengelyere igazit es a tobbit LEVAGJA. Egy
       * katalogusban, ahol a fotok kulonbozo szallitotol jonnek es kulonbozo
       * alakuak, ez termekenkent MAS reszt vag le -- ezt latta Balazs a
       * kepernyokepen.
       *
       * A `contain` cserebe ures helyet hagy a kulonbozo alaku fotok korul.
       * Ez TUDATOS csere, nem mellekhatas: a doboz meret azonos marad, es a
       * termek mindig egeszben latszik. A `bg-white` azert kell, hogy ez az
       * ures hely a termekfotok feher hatterevel folytonos legyen, ne a doboz
       * szurkejevel.
       */
      className="absolute inset-0 object-contain object-center bg-white"
      draggable={false}
      quality={50}
      sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      fill
    />
  ) : (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center">
      <PlaceholderImage size={size === "small" ? 16 : 24} />
    </div>
  )
}

export default Thumbnail
