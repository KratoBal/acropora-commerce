"use client"

import { useActionState } from "react"
import { STORE_NAME } from "@lib/store"
import Input from "@modules/common/components/input"
import { LOGIN_VIEW } from "@modules/account/templates/login-template"
import ErrorMessage from "@modules/checkout/components/error-message"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { signup } from "@lib/data/customer"

type Props = {
  setCurrentView: (view: LOGIN_VIEW) => void
}

const Register = ({ setCurrentView }: Props) => {
  const [message, formAction] = useActionState(signup, null)

  return (
    <div
      className="max-w-sm flex flex-col items-center"
      data-testid="register-page"
    >
      <h1 className="text-large-semi uppercase mb-6">
        Legyél a {STORE_NAME} tagja
      </h1>
      <p className="text-center text-base-regular text-ui-fg-base mb-4">
        Hozd létre a {STORE_NAME}-fiókodat a kényelmesebb vásárlási élményért.
      </p>
      {message?.state === "verification_required" && (
        <div
          className="w-full mb-4 text-center text-base-regular text-ui-fg-base bg-ui-bg-subtle border border-ui-border-base rounded-rounded p-4"
          data-testid="register-verification-message"
        >
          Ellenőrző linket küldtünk ide: <strong>{message.email}</strong>. Nézd
          meg a postafiókodat, ellenőrizd az e-mail-címedet, majd jelentkezz be.
        </div>
      )}
      <form className="w-full flex flex-col" action={formAction}>
        <div className="flex flex-col w-full gap-y-2">
          <Input
            label="Keresztnév"
            name="first_name"
            required
            autoComplete="given-name"
            data-testid="first-name-input"
          />
          <Input
            label="Vezetéknév"
            name="last_name"
            required
            autoComplete="family-name"
            data-testid="last-name-input"
          />
          <Input
            label="E-mail-cím"
            name="email"
            required
            type="email"
            autoComplete="email"
            data-testid="email-input"
          />
          <Input
            label="Telefonszám"
            name="phone"
            type="tel"
            autoComplete="tel"
            data-testid="phone-input"
          />
          <Input
            label="Jelszó"
            name="password"
            required
            type="password"
            autoComplete="new-password"
            data-testid="password-input"
          />
        </div>
        <ErrorMessage
          error={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <span className="text-center text-ui-fg-base text-small-regular mt-6">
          A fiók létrehozásával elfogadod a {STORE_NAME}{" "}
          <LocalizedClientLink
            href="/content/privacy-policy"
            className="underline"
          >
            Adatkezelési tájékoztató
          </LocalizedClientLink>{" "}
          és a(z){" "}
          <LocalizedClientLink
            href="/content/terms-of-use"
            className="underline"
          >
            Felhasználási feltételek
          </LocalizedClientLink>
          .
        </span>
        <SubmitButton className="w-full mt-6" data-testid="register-button">
          Regisztráció
        </SubmitButton>
      </form>
      <span className="text-center text-ui-fg-base text-small-regular mt-6">
        Már van fiókod?{" "}
        <button
          onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
          className="underline"
        >
          Belépés
        </button>
        .
      </span>
    </div>
  )
}

export default Register
