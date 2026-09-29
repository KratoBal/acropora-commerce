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
      {message?.state === "verification_required" && (
        <p
          className="border border-acr-line bg-acr-mist p-3 text-[13px] leading-[19px] text-acr-ink"
          data-testid="login-verification-message"
        >
          Ellenőrző linket küldtünk ide: <strong>{message.email}</strong>.
          Ellenőrizd az e-mail-címedet, majd jelentkezz be.
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
