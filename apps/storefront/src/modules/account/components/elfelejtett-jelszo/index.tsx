"use client"

import { useActionState } from "react"

import { jelszoVisszaallitasAkcio } from "@lib/data/jelszo-visszaallitas"
import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import { authHibaFelirat } from "@lib/util/auth-hiba"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { AuthGomb, AuthHiba, AuthKartya, AuthMezo } from "../auth"

/**
 * AZ ELFELEJTETT JELSZO LAPJA (kartya 7bfca4eb): egy e-mail-mezo, es a valasz ALTALANOS ("ha van fiokod ezzel a cimmel,
 * elkuldtuk"): a lap nem arulja el, melyik cim regisztralt. A level a bolt dolga (az OS sablonja); itt csak a kerest visszuk.
 * Siker utan az urlap eltunik, es a mondat all a helyen; hibanal a beirt cim megmarad (a React 19 az urlapot alaphelyzetbe allitja).
 */
export default function ElfelejtettJelszo() {
  const t = useTranslate()
  const locale = useLocale()
  const [allapot, formAction] = useActionState(jelszoVisszaallitasAkcio, null)
  const beirt = allapot?.state === "error" ? allapot.ertekek : undefined

  return (
    <AuthKartya
      cim={t("account.auth.forgot.title")}
      leiras={t("account.auth.forgot.description")}
      mobilLeiras={t("account.auth.forgot.mobileDescription")}
      data-testid="elfelejtett-jelszo-page"
    >
      {allapot?.state === "success" ? (
        <p
          role="status"
          className="border border-acr-line bg-acr-mist p-3 text-[13px] leading-[19px] text-acr-ink"
          data-testid="elfelejtett-jelszo-kesz"
        >
          {t("account.auth.forgot.sent")}
        </p>
      ) : (
        <form className="flex flex-col gap-[14px]" action={formAction}>
          <input type="hidden" name="locale" value={locale} />
          <AuthMezo
            cimke={t("account.auth.forgot.email")}
            name="email"
            type="email"
            title={t("account.auth.forgot.emailTitle")}
            autoComplete="email"
            required
            defaultValue={beirt?.email ?? ""}
            data-testid="elfelejtett-email-input"
          />
          <AuthHiba
            hiba={
              allapot?.state === "error"
                ? authHibaFelirat(allapot.error, t)
                : null
            }
            data-testid="elfelejtett-jelszo-hiba"
          />
          <AuthGomb data-testid="elfelejtett-jelszo-gomb">
            {t("account.auth.forgot.submit")}
          </AuthGomb>
        </form>
      )}
      <p className="text-[12.3px] leading-[16px] text-acr-slate small:text-[12.5px]">
        <LocalizedClientLink
          href="/account"
          className="font-semibold text-acr-heritage underline underline-offset-2"
          data-testid="elfelejtett-vissza"
        >
          {t("account.auth.forgot.toLogin")}
        </LocalizedClientLink>
      </p>
    </AuthKartya>
  )
}
