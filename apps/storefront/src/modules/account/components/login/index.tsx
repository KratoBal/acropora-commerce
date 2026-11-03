import { login } from "@lib/data/customer"
import { useTranslate } from "@lib/i18n/use-translate"
import { authHibaFelirat } from "@lib/util/auth-hiba"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import { useActionState } from "react"

import { AuthGomb, AuthHiba, AuthKartya, AuthMezo, AuthValto } from "../auth"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

/**
 * BELEPES (P5, 256:3; mobilon 256:103). A keret "Emlékezz rám" es
 * "Elfelejtett jelszó" sora nem epul: az elsohoz a munkamenet hossza nem
 * allithato, a masodikhoz nincs levelkuldes (docs/P5-LEFT-OUT.md).
 */
const Login = ({ setCurrentView }: Props) => {
  const t = useTranslate()
  const [message, formAction] = useActionState(login, null)
  // A failed sign-in keeps the email (React 19 resets the form after the
  // action); the password is typed again.
  const beirt = message?.state === "error" ? message.ertekek : undefined

  return (
    <AuthKartya
      cim={t("account.auth.login.title")}
      leiras={t("account.auth.login.description")}
      mobilLeiras={t("account.auth.login.mobileDescription")}
      data-testid="login-page"
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
          data-testid="login-verification-message"
        >
          {t("account.auth.login.verificationStart")}{" "}
          <strong>{message.email}</strong>.{" "}
          {t("account.auth.login.verificationEnd")}
        </p>
      )}
      <form className="flex flex-col gap-[14px]" action={formAction}>
        <AuthMezo
          cimke={t("account.auth.login.email")}
          name="email"
          type="email"
          title={t("account.auth.login.emailTitle")}
          autoComplete="email"
          required
          defaultValue={beirt?.email ?? ""}
          data-testid="email-input"
        />
        <AuthMezo
          cimke={t("account.auth.login.password")}
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="password-input"
        />
        <AuthHiba
          hiba={
            message?.state === "error"
              ? authHibaFelirat(message.error, t)
              : null
          }
          data-testid="login-error-message"
        />
        <AuthGomb data-testid="sign-in-button">
          {t("account.auth.login.submit")}
        </AuthGomb>
      </form>
      <AuthValto
        mondat={t("account.auth.login.noAccount")}
        gomb={t("account.auth.login.toRegister")}
        onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
        data-testid="register-button"
      />
    </AuthKartya>
  )
}

export default Login
