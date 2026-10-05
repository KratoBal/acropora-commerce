import { login } from "@lib/data/customer"
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
  const [message, formAction] = useActionState(login, null)
  // A failed sign-in keeps the email (React 19 resets the form after the
  // action); the password is typed again.
  const beirt = message?.state === "error" ? message.ertekek : undefined

  return (
    <AuthKartya
      cim="Bejelentkezés"
      leiras="Lépj be a rendeléseidhez, címeidhez és számláidhoz."
      mobilLeiras="Lépj be a rendeléseidhez és számláidhoz."
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
          A belépés előtt ellenőrizni kell ezt az e-mail-címet:{" "}
          <strong>{message.email}</strong>. Az ellenőrző levél küldése még nincs
          bekötve, ezért kérjük, vedd fel velünk a kapcsolatot.
        </p>
      )}
      <form className="flex flex-col gap-[14px]" action={formAction}>
        <AuthMezo
          cimke="E-mail"
          name="email"
          type="email"
          title="Adj meg érvényes e-mail-címet."
          autoComplete="email"
          required
          defaultValue={beirt?.email ?? ""}
          data-testid="email-input"
        />
        <AuthMezo
          cimke="Jelszó"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          data-testid="password-input"
        />
        <AuthHiba
          hiba={message?.state === "error" ? message.error : null}
          data-testid="login-error-message"
        />
        <AuthGomb data-testid="sign-in-button">Bejelentkezés</AuthGomb>
      </form>
      <AuthValto
        mondat="Nincs még fiókod?"
        gomb="Regisztráció"
        onClick={() => setCurrentView(LOGIN_VIEW.REGISTER)}
        data-testid="register-button"
      />
    </AuthKartya>
  )
}

export default Login
