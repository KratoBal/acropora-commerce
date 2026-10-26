"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import { ervenyesRekord } from "@lib/util/kezdolap-rekord"
import { BLOKK_KULCSOK } from "@modules/kezdolap/blokkok"
import {
  EgyediKorallokSav,
  termekekHandleSzerint,
} from "@modules/kezdolap/components/egyedi-korallok"
import { KL_TOKENEK } from "@modules/kezdolap/kl-tokenek"
import { savokElemei } from "@modules/kezdolap/savok"
import { kezdolapAdat, type KezdolapTartalom } from "@modules/kezdolap/tartalom"
import type { LablecAdat } from "@modules/layout/templates/footer/lablec-adat"
import { LablecKeret } from "@modules/layout/templates/footer/lablec-keret"
import type { HttpTypes } from "@medusajs/types"
import { lablecAdatElonezethez } from "./akciok"

const VERZIO = 1
const TIPUS = {
  kesz: "acropora:homepage-preview:ready",
  kijelolt: "acropora:homepage-preview:selected",
  hiba: "acropora:homepage-preview:error",
  tartalom: "acropora:homepage-preview:content",
  kijelol: "acropora:homepage-preview:select",
} as const

type Props = {
  /** Az OS cime, ha ervenyes origin; `null`: nincs kihez uzenni, nincs kitol fogadni. */
  osOrigin: string | null
  countryCode: string
  /** A mentett rekord: ez latszik, amig az OS az elso tartalmat el nem kuldi. */
  kezdoRekord: KezdolapTartalom | null
  kezdoLablec: LablecAdat
  kollekciok: Array<{ id: string; handle: string; title: string }>
  /** Szerveroldalon renderelt fejlec (a menu a valodi kategoriakbol all). */
  fejlec: ReactNode
}

/**
 * A KEZDOLAP ELO ELONEZETE, A KLIENS OLDALA (protokoll v1).
 *
 * ORIGIN: a `message` esemenyt csak az OS cimerol fogadja (`event.origin ===
 * osOrigin`), es a `postMessage` celja SOHA nem `*`: ha az OS cime nincs vagy
 * ervenytelen, a kliens nem fogad es nem kuld semmit. Ismeretlen `type` vagy
 * `version != 1`: csendben eldobva.
 *
 * A REKORDOT a kliens ellenorzi (a szerver is, ahol sanitize-html is kell): ha
 * elutasitott, SEMMIT nem rajzol at belole, es `error` uzenetet kuld. A savok
 * UGYANAZ a komponens-lista (`savokElemei`), mint a valodi kezdolapon; a lablec
 * ugyanaz a `LablecKeret`.
 *
 * A KATTINTAS kijeloli a blokkot (`selected`), de a linkek nem visznek el az
 * elonezetbol: egy navigacio megszuntetne az iframe tartalmat.
 */
export default function ElonezetKliens({
  osOrigin,
  countryCode,
  kezdoRekord,
  kezdoLablec,
  kollekciok,
  fejlec,
}: Props) {
  const [rekord, setRekord] = useState<KezdolapTartalom | null>(kezdoRekord)
  const [lablec, setLablec] = useState<LablecAdat>(kezdoLablec)
  const [termekek, setTermekek] = useState<HttpTypes.StoreProduct[]>([])
  const [kijelolt, setKijelolt] = useState<string | null>(null)
  const sorszam = useRef(0)

  const uzen = (uzenet: Record<string, unknown>) => {
    if (!osOrigin || window.parent === window) return
    window.parent.postMessage({ ...uzenet, version: VERZIO }, osOrigin)
  }

  useEffect(() => {
    if (!osOrigin) return
    const fogad = (esemeny: MessageEvent) => {
      if (esemeny.origin !== osOrigin) return
      const adat = esemeny.data as Record<string, unknown> | null
      if (!adat || typeof adat !== "object" || adat.version !== VERZIO) return
      if (adat.type === TIPUS.tartalom) {
        const eredmeny = ervenyesRekord(adat.record)
        if (!eredmeny.ok) {
          uzen({ type: TIPUS.hiba, message: eredmeny.hiba })
          return
        }
        const ez = ++sorszam.current
        setRekord(eredmeny.rekord)
        void lablecAdatElonezethez(eredmeny.rekord).then((valasz) => {
          // egy lassabb, regebbi valasz ne irja felul az ujabbat
          if (ez !== sorszam.current) return
          if (valasz.ok) setLablec(valasz.adat)
          else uzen({ type: TIPUS.hiba, message: valasz.hiba })
        })
      } else if (adat.type === TIPUS.kijelol) {
        const blokk = adat.block
        setKijelolt(
          typeof blokk === "string" &&
            (BLOKK_KULCSOK as readonly string[]).includes(blokk)
            ? blokk
            : null,
        )
      }
    }
    window.addEventListener("message", fogad)
    uzen({ type: TIPUS.kesz })
    return () => window.removeEventListener("message", fogad)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [osOrigin])

  const handles = rekord?.featured_handles ?? []
  const handleKulcs = handles.join("|")
  useEffect(() => {
    let elavult = false
    void termekekHandleSzerint(
      handleKulcs ? handleKulcs.split("|") : [],
      countryCode,
    )
      .then((lista) => {
        if (!elavult) setTermekek(lista)
      })
      .catch(() => {
        if (!elavult) setTermekek([])
      })
    return () => {
      elavult = true
    }
  }, [handleKulcs, countryCode])

  const adat = useMemo(() => kezdolapAdat(rekord), [rekord])
  const savok = savokElemei(
    rekord,
    <EgyediKorallokSav s={adat} termekek={termekek} />,
  )

  return (
    <>
      {kijelolt ? (
        <style>{`[data-homepage-block="${kijelolt}"]{outline:3px solid #1d5b87;outline-offset:-3px}`}</style>
      ) : null}
      <div
        style={KL_TOKENEK}
        onClickCapture={(esemeny) => {
          const cel = esemeny.target as HTMLElement
          const blokk = cel
            .closest<HTMLElement>("[data-homepage-block]")
            ?.getAttribute("data-homepage-block")
          if (cel.closest("a")) esemeny.preventDefault()
          if (blokk) uzen({ type: TIPUS.kijelolt, block: blokk })
        }}
      >
        {fejlec}
        {savok}
      </div>
      <LablecKeret lablec={lablec} collections={kollekciok} />
    </>
  )
}
