"use client"

import { useEffect, useState, useTransition } from "react"

import { hirlevelLinkKuldes } from "@lib/data/hirlevel"
import { translator, type Translate } from "@lib/i18n/dictionary"
import { useLocale } from "@lib/i18n/use-translate"
import type {
  HirlevelLinkAllapot,
  HirlevelLinkFajta,
} from "@lib/util/hirlevel-link"
import { Button } from "@modules/common/components/ui"

const uzenet = (allapot: HirlevelLinkAllapot, t: Translate): string => {
  switch (allapot.allapot) {
    case "megerositve":
      return t("newsletterLink.confirmed")
    case "leiratkozva":
      return t("newsletterLink.left")
    case "lejart":
      return t("newsletterLink.expired")
    case "ervenytelen":
      return t("newsletterLink.invalid")
    case "hiba":
      return t(
        allapot.ok === "korlat"
          ? "newsletterLink.limit"
          : "newsletterLink.failed",
      )
  }
}

/**
 * A HIRLEVEL-LINK LAPJANAK URLAPJA (d707cf5f): a token a cim `token`
 * parameterebol jon (a bongeszoben olvasva), es CSAK a gomb megnyomasara megy a bolthoz (egy
 * levelszkenner, ami megnyitja a linket, nem kattint). Token nelkul a lap
 * rogton az ervenytelen linket mondja, gomb nelkul.
 */
export default function HirlevelLinkUrlap({
  fajta,
}: {
  fajta: HirlevelLinkFajta
}) {
  const t = translator(useLocale())
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
        {t("newsletterLink.invalid")}
      </p>
    )
  // a kesz valasz utan nincs gomb: az ujabb kattintas ugyanazt adna, vagy (egyszer hasznalhato linknel) ervenytelent
  if (allapot && allapot.allapot !== "hiba")
    return (
      <p role="status" data-testid="hirlevel-link-allapot">
        {uzenet(allapot, t)}
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
            setAllapot(await hirlevelLinkKuldes(fajta, token))
          })
        }
      >
        {t(
          fajta === "megerosites"
            ? "newsletterLink.confirmButton"
            : "newsletterLink.leaveButton",
        )}
      </Button>
      {allapot ? (
        <p role="alert" data-testid="hirlevel-link-allapot">
          {uzenet(allapot, t)}
        </p>
      ) : null}
    </div>
  )
}
