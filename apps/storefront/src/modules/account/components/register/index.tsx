"use client"

import { useTranslate } from "@lib/i18n/use-translate"
import { authHibaFelirat } from "@lib/util/auth-hiba"
import { useActionState } from "react"

import { signup } from "@lib/data/customer"
import { ADATKEZELES_CIM, ASZF_CIM } from "@lib/util/aszf"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"

import { AuthGomb, AuthHiba, AuthKartya, AuthMezo, AuthValto } from "../auth"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

/**
 * REGISZTRACIO (P5, 256:36; mobilon 256:124).
 *
 * A keret egyetlen "Név" mezot mutat; itt KET mezo all (vezeteknev,
 * keresztnev), mert a Medusa vevo ket mezon tarolja, es a szamla is kulon
 * kezeli. Szetvagni egy mezot szokoznel talalgatas lenne. A telefonszam a
 * profilba kerul, ahogy a keret is mutatja (257:3).
 *
 * AZ ASZF-PIPA KOTELEZO, es az elfogadas IDOBELYEGGEL ES VERZIOVAL rogzul a
 * vevon (`lib/util/aszf.ts`). A szerver is ellenorzi, nem csak a bongeszo.
 */
const Register = ({ setCurrentView }: Props) => {
  const t = useTranslate()
  const [message, formAction] = useActionState(signup, null)
  // After a failed submit the fields refill from the submitted values: React 19
  // resets the form after the action. The passwords are typed again.
  const beirt = message?.state === "error" ? message.ertekek : undefined

  return (
    <AuthKartya
      cim={t("account.auth.register.title")}
      leiras={t("account.auth.register.description")}
      mobilLeiras={t("account.auth.register.mobileDescription")}
      data-testid="register-page"
    >
      {/*
        NEM ALLITJUK, HOGY LEVELET KULDTUNK (Balazs, 2026-10-05): a commerce
        hatter vevoi levelet nem kuld. Ez az ag ma el sem erheto, mert a
        `medusa-config.ts`-ben nincs `authVerificationsPerActor`, tehat a Medusa
        nem ker e-mail-ellenorzest. Ha valaki bekapcsolja, amig a level nem
        megy ki, a regisztracio NEM fejezheto be: ez a szoveg ezt mondja meg.
      */}
      {message?.state === "verification_required" && (
        <p
          className="border border-acr-line bg-acr-mist p-3 text-[13px] leading-[19px] text-acr-ink"
          data-testid="register-verification-message"
        >
          {t("account.auth.login.verificationStart")}{" "}
          <strong>{message.email}</strong>.{" "}
          {t("account.auth.login.verificationEnd")}
        </p>
      )}
      <form className="flex flex-col gap-[14px]" action={formAction}>
        <AuthMezo
          cimke={t("account.auth.register.lastName")}
          name="last_name"
          required
          defaultValue={beirt?.last_name ?? ""}
          autoComplete="family-name"
          data-testid="last-name-input"
        />
        <AuthMezo
          cimke={t("account.auth.register.firstName")}
          name="first_name"
          required
          defaultValue={beirt?.first_name ?? ""}
          autoComplete="given-name"
          data-testid="first-name-input"
        />
        <AuthMezo
          cimke={t("account.auth.register.email")}
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={beirt?.email ?? ""}
          data-testid="email-input"
        />
        <AuthMezo
          cimke={t("account.auth.register.password")}
          name="password"
          type="password"
          required
          autoComplete="new-password"
          data-testid="password-input"
        />
        <AuthMezo
          cimke={t("account.auth.register.passwordAgain")}
          name="password_again"
          type="password"
          required
          autoComplete="new-password"
          data-testid="password-again-input"
        />
        <label className="flex items-start gap-2 text-[12.3px] leading-[16px] text-acr-slate small:text-[12.5px]">
          <input
            type="checkbox"
            name="aszf"
            required
            defaultChecked={beirt?.aszf === "on"}
            className="mt-px h-[15px] w-[15px] shrink-0 accent-[var(--acr-color-navy)]"
            data-testid="aszf-checkbox"
          />
          <span>
            {t("account.auth.register.acceptStart")}{" "}
            <a
              href={ASZF_CIM}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-acr-ink"
            >
              {t("account.auth.register.termsLink")}
            </a>{" "}
            {t("account.auth.register.acceptMiddle")}{" "}
            <a
              href={ADATKEZELES_CIM}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-acr-ink"
            >
              {t("account.auth.register.privacyLink")}
            </a>
            .
          </span>
        </label>
        <AuthHiba
          hiba={
            message?.state === "error"
              ? authHibaFelirat(message.error, t)
              : null
          }
          data-testid="register-error"
        />
        <AuthGomb data-testid="register-button">
          {t("account.auth.register.submit")}
        </AuthGomb>
      </form>
      <AuthValto
        mondat={t("account.auth.register.haveAccount")}
        gomb={t("account.auth.register.toLogin")}
        onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
        data-testid="sign-in-link"
      />
    </AuthKartya>
  )
}

export default Register
