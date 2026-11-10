"use client"

import { useEffect, useState, useTransition } from "react"

import { hirlevelLinkKuldes } from "@lib/data/hirlevel"
import { szoljLinkKuldes } from "@lib/data/szolj-hasonlo"
import { translator, type Translate } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type {
  HirlevelLinkAllapot,
  HirlevelLinkFajta,
} from "@lib/util/hirlevel-link"
import { Button } from "@modules/common/components/ui"

/**
 * KET LISTA, EGY LAP-MINTA: a hirlevel (d707cf5f) es a "Szólj, ha jön hasonló"
 * ertesites (V2.4) levelenek ket linkje ugyanugy mukodik; a szovegek csoportja
 * es a bolt utja mas.
 */
export type LinkTema = "hirlevel" | "ertesites"

const TEMA = {
  hirlevel: { szoveg: "newsletterLink", kuld: hirlevelLinkKuldes },
  ertesites: { szoveg: "stockAlertLink", kuld: szoljLinkKuldes },
} as const

const uzenet = (
  allapot: HirlevelLinkAllapot,
  t: Translate,
  cs: (typeof TEMA)[LinkTema]["szoveg"],
): string => {
  switch (allapot.allapot) {
    case "megerositve":
      return t(`${cs}.confirmed`)
    case "leiratkozva":
      return t(`${cs}.left`)
    case "lejart":
      return t(`${cs}.expired`)
    case "ervenytelen":
      return t(`${cs}.invalid`)
    case "hiba":
      return t(allapot.ok === "korlat" ? `${cs}.limit` : `${cs}.failed`)
  }
}

/**
 * A KESZ VALASZ UTAN A CIMBOL KIKERUL A TOKEN (barracuda, d707cf5f): a token a level titka, es a megerosites vagy a
 * leiratkozas utan a cimsorban, az elozmenyekben es egy megosztott vagy kepernyokepen latszo cimben nincs mit keresnie.
 * A lap ujratoltese utan a token nelkuli cim az ervenytelen linket mondja, ami igaz: a link elhasznalodott. Hiba utan
 * marad (a gomb ujra probalhato, es a lap ujratoltve is). A `history.state` megmarad: azt a Next routere tartja.
 */
function tokenNelkuliCim() {
  const cim = new URL(window.location.href)
  if (!cim.searchParams.has("token")) return
  cim.searchParams.delete("token")
  window.history.replaceState(
    window.history.state,
    "",
    cim.pathname + cim.search + cim.hash,
  )
}

/**
 * A HIRLEVEL-LINK LAPJANAK URLAPJA (d707cf5f): a token a cim `token`
 * parameterebol jon (a bongeszoben olvasva), es CSAK a gomb megnyomasara megy a bolthoz (egy
 * levelszkenner, ami megnyitja a linket, nem kattint). Token nelkul a lap
 * rogton az ervenytelen linket mondja, gomb nelkul.
 */
export default function HirlevelLinkUrlap({
  fajta,
  tema = "hirlevel",
}: {
  fajta: HirlevelLinkFajta
  tema?: LinkTema
}) {
  const t = translator(useLocale())
  const cs = TEMA[tema].szoveg
  // a cimet a bongeszobol olvassa, nem `useSearchParams`-szal: a lap ISR, es azon renderkor nem szabad (statikus-lap-kereso.spec.tsx)
  const [token, setToken] = useState<string | null>(null)
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token") ?? "")
  }, [])
  const [allapot, setAllapot] = useState<HirlevelLinkAllapot | null>(null)
  const [folyamatban, startTransition] = useTransition()

  if (token === null) return null
  if (!token)
    return (
      <p role="status" data-testid="hirlevel-link-allapot">
        {t(`${cs}.invalid`)}
      </p>
    )
  // a kesz valasz utan nincs gomb: az ujabb kattintas ugyanazt adna, vagy (egyszer hasznalhato linknel) ervenytelent
  if (allapot && allapot.allapot !== "hiba")
    return (
      <p role="status" data-testid="hirlevel-link-allapot">
        {uzenet(allapot, t, cs)}
      </p>
    )
  return (
    <div className="flex flex-col items-start gap-y-4">
      <Button
        type="button"
        isLoading={folyamatban}
        disabled={folyamatban}
        data-testid="hirlevel-link-gomb"
        onClick={() =>
          startTransition(async () => {
            const valasz = await TEMA[tema].kuld(fajta, token)
            if (valasz.allapot !== "hiba") tokenNelkuliCim()
            setAllapot(valasz)
          })
        }
      >
        {t(
          fajta === "megerosites" ? `${cs}.confirmButton` : `${cs}.leaveButton`,
        )}
      </Button>
      {allapot ? (
        <p role="alert" data-testid="hirlevel-link-allapot">
          {uzenet(allapot, t, cs)}
        </p>
      ) : null}
    </div>
  )
}
