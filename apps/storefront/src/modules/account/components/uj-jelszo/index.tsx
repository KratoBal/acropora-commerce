"use client"

import { useActionState, useEffect, useState } from "react"

import { ujJelszoAkcio } from "@lib/data/jelszo-visszaallitas"
import { useTranslate } from "@lib/i18n/use-translate"
import { authHibaFelirat } from "@lib/util/auth-hiba"
import { VISSZAALLITO_TOKEN } from "@lib/util/jelszo-visszaallitas"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { AuthGomb, AuthHiba, AuthKartya, AuthMezo } from "../auth"

/**
 * A TOKEN KIKERUL A CIMBOL (kartya 7bfca4eb): a token a level titka, es az olvasas utan a cimsorban, az elozmenyekben es egy
 * megosztott vagy kepernyokepen latszo cimben nincs mit keresnie (mint a hirlevel linkjenel). Az allapotban marad, az urlap rejtett
 * mezoje viszi a szerverre.
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
 * AZ UJ JELSZO LAPJA (kartya 7bfca4eb): a token a cim `token` parameterebol jon (a bongeszoben olvasva, a lap ISR), es CSAK az
 * urlap elkuldesekor megy a bolthoz (egy levelszkenner, ami megnyitja a linket, nem ment semmit). Token nelkul, vagy ha a token
 * alakja nem a visszaallito tokene, a lap rogton azt mondja, hogy a link nem ervenyes, es uj kerese lehetseges. Siker utan az
 * urlap eltunik, es a belepes linkje all a helyen; a jelszavak nem mennek vissza az urlapra.
 */
export default function UjJelszo() {
  const t = useTranslate()
  // a cimet a bongeszobol olvassa, nem `useSearchParams`-szal: a lap ISR, es azon renderkor nem szabad
  const [token, setToken] = useState<string | null>(null)
  const [olvasva, setOlvasva] = useState(false)
  useEffect(() => {
    setToken(new URLSearchParams(window.location.search).get("token"))
    setOlvasva(true)
    tokenNelkuliCim()
  }, [])
  const [allapot, formAction] = useActionState(ujJelszoAkcio, null)
  const joToken = !!token && VISSZAALLITO_TOKEN.test(token)

  return (
    <AuthKartya
      cim={t("account.auth.reset.title")}
      leiras={t("account.auth.reset.description")}
      mobilLeiras={t("account.auth.reset.mobileDescription")}
      data-testid="uj-jelszo-page"
    >
      {allapot?.state === "success" ? (
        <>
          <p
            role="status"
            className="border border-acr-line bg-acr-mist p-3 text-[13px] leading-[19px] text-acr-ink"
            data-testid="uj-jelszo-kesz"
          >
            {t("account.auth.reset.done")}
          </p>
          <LocalizedClientLink
            href="/account"
            className="font-semibold text-acr-heritage underline underline-offset-2"
            data-testid="uj-jelszo-belepes"
          >
            {t("account.auth.reset.toLogin")}
          </LocalizedClientLink>
        </>
      ) : olvasva && !joToken && !allapot ? (
        <>
          <p
            role="alert"
            className="border border-acr-line bg-acr-mist p-3 text-[13px] leading-[19px] text-acr-ink"
            data-testid="uj-jelszo-nincs-link"
          >
            {t("account.auth.reset.noLink")}
          </p>
          <LocalizedClientLink
            href="/elfelejtett-jelszo"
            className="font-semibold text-acr-heritage underline underline-offset-2"
            data-testid="uj-jelszo-uj-link"
          >
            {t("account.auth.reset.askNew")}
          </LocalizedClientLink>
        </>
      ) : (
        <form className="flex flex-col gap-[14px]" action={formAction}>
          <input type="hidden" name="token" value={token ?? ""} />
          <AuthMezo
            cimke={t("account.auth.reset.password")}
            name="password"
            type="password"
            autoComplete="new-password"
            required
            data-testid="uj-jelszo-input"
          />
          <AuthMezo
            cimke={t("account.auth.reset.passwordAgain")}
            name="password_again"
            type="password"
            autoComplete="new-password"
            required
            data-testid="uj-jelszo-ujra-input"
          />
          <AuthHiba
            hiba={
              allapot?.state === "error"
                ? authHibaFelirat(allapot.error, t)
                : null
            }
            data-testid="uj-jelszo-hiba"
          />
          <AuthGomb data-testid="uj-jelszo-gomb">
            {t("account.auth.reset.submit")}
          </AuthGomb>
          {allapot?.state === "error" &&
            allapot.error === "reset_link_invalid" && (
              <LocalizedClientLink
                href="/elfelejtett-jelszo"
                className="text-[12.5px] font-semibold text-acr-heritage underline underline-offset-2"
                data-testid="uj-jelszo-uj-link-hiba"
              >
                {t("account.auth.reset.askNew")}
              </LocalizedClientLink>
            )}
        </form>
      )}
    </AuthKartya>
  )
}
