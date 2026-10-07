"use client"

import { getImageProps } from "next/image"
import { useState } from "react"

import { KEP_ARANY_OSZTALY, TovabbiKepek } from "./kep-meret"

type Kep = { id?: string | null; url?: string | null }

/**
 * A MUSZAKI LAPOK KEP-BLOKKJA: NAGY KEP PLUSZ A SOR, KATTINTHATOAN.
 *
 * === MIERT KULON KOMPONENS, ES NEM A GALERIA ===
 *
 * A ket kep-ut MAS megjelenitovel dolgozik: a galeria `next/image`-dzsel, ez
 * sima `<img>`-gel. Az EGYESITESUK azt jelentene, hogy az egyik oldal
 * kep-kezelese megvaltozik (optimalizalas, meretezes) -- es azt egy
 * kattinthatosagot javito kor nem dontheti el.
 *
 * Ezert nem egyesitunk: mind a ket ut MEGTARTJA a sajat megjelenitojet, es
 * csak az ALLAPOT-kezeles kozos alakja ismetlodik. A sor maga (`TovabbiKepek`)
 * tenylegesen kozos.
 *
 * === MIERT KLIENS KOMPONENS ===
 *
 * A valasztas allapot, es a nagy kep meg a sor ugyanazt olvassa. A `Foto`
 * szerver komponens, tehat nem tud kezelot atadni a sornak -- pontosan ezert
 * allt a sor HOLTAN a muszaki lapokon is.
 *
 * Balazs szava (2026-09-09 16:37, Commerce frontend szal): "A kis kepek ott
 * vannak a nagy kep alatt a termekeknel de nem kattinthato. Jo lenne ha
 * kattintassa kicserelne a nagykepet."
 */
export const KepBlokk = ({
  kepek,
  alt,
  jelolo = "vaz-foto",
}: {
  kepek: Kep[]
  alt: string
  jelolo?: string
}) => {
  const [kivalasztott, setKivalasztott] = useState(0)

  const ervenyes = kepek.filter((k) => k.url)
  if (ervenyes.length === 0) return null

  const nagy = ervenyes[kivalasztott] ?? ervenyes[0]

  /*
    A FO KEP A NEXT OPTIMALIZALOJAN AT (FE-3, a webshop sajat optimalizaloja,
    `sharp` a storefront kontenerben): `srcset`/`sizes`, szelesseg es
    magassag, es `fetchpriority="high"` eloltoltessel, mert ez a lap LCP-eleme.
    A `getImageProps` a sima `<img>`-et tartja meg: az osztalyok, a jelolo es a
    CSS-horgony (`termeklap-nagykep`) valtozatlanok. A 1600x1000 a 16:10-es
    asztali doboz aranya; a valodi dobozt a CSS-arany adja, igy nincs elugras.
  */
  const { props: nagyKep } = getImageProps({
    src: nagy.url ?? "",
    alt,
    width: 1600,
    height: 1000,
    sizes: "(min-width: 1024px) 860px, 100vw",
    priority: kivalasztott === 0,
    // a `getImageProps` a `priority`-bol nem tesz `fetchpriority`-t (merve a
    // helyi epitesen, 15.5.24), ezert kulon all
    fetchPriority: kivalasztott === 0 ? "high" : undefined,
  })

  return (
    <div className="flex flex-col gap-2" data-testid="vaz-foto-blokk">
      <img
        {...nagyKep}
        alt={alt}
        className={`termeklap-nagykep w-full ${KEP_ARANY_OSZTALY}`}
        style={{ objectFit: "contain" }}
        data-testid={jelolo}
      />
      {/*
        EGYETLEN KEPNEL NINCS SOR -- ugyanaz az ok, mint a galerianal: egy
        egy-csempes sor nem kinal valasztast, csak megismetli a folotte allo
        kepet.
      */}
      <TovabbiKepek
        kepek={(ervenyes.length > 1 ? ervenyes : []) as never}
        kivalasztott={kivalasztott}
        onValaszt={setKivalasztott}
      />
    </div>
  )
}
