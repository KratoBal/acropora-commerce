"use client"

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
  const [message, formAction] = useActionState(signup, null)
  // After a failed submit the fields refill from the submitted values: React 19
  // resets the form after the action. The passwords are typed again.
  const beirt = message?.state === "error" ? message.ertekek : undefined

  return (
    <AuthKartya
      cim="Regisztráció"
      leiras="Hozd létre az Acropora fiókodat a gyorsabb vásárláshoz."
      mobilLeiras="Hozd létre az Acropora fiókodat."
      data-testid="register-page"
    >
      {message?.state === "verification_required" && (
        <p
          className="border border-acr-line bg-acr-mist p-3 text-[13px] leading-[19px] text-acr-ink"
          data-testid="register-verification-message"
        >
          Ellenőrző linket küldtünk ide: <strong>{message.email}</strong>. Nézd
          meg a postafiókodat, ellenőrizd az e-mail-címedet, majd jelentkezz be.
        </p>
      )}
      <form className="flex flex-col gap-[14px]" action={formAction}>
        <AuthMezo
          cimke="Vezetéknév"
          name="last_name"
          required
          defaultValue={beirt?.last_name ?? ""}
          autoComplete="family-name"
          data-testid="last-name-input"
        />
        <AuthMezo
          cimke="Keresztnév"
          name="first_name"
          required
          defaultValue={beirt?.first_name ?? ""}
          autoComplete="given-name"
          data-testid="first-name-input"
        />
        <AuthMezo
          cimke="E-mail"
          name="email"
          type="email"
          required
          autoComplete="email"
          defaultValue={beirt?.email ?? ""}
          data-testid="email-input"
        />
        <AuthMezo
          cimke="Jelszó"
          name="password"
          type="password"
          required
          autoComplete="new-password"
          data-testid="password-input"
        />
        <AuthMezo
          cimke="Jelszó újra"
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
            Elfogadom az{" "}
            <a
              href={ASZF_CIM}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-acr-ink"
            >
              ÁSZF-et
            </a>{" "}
            és az{" "}
            <a
              href={ADATKEZELES_CIM}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2 hover:text-acr-ink"
            >
              adatkezelési tájékoztatót
            </a>
            .
          </span>
        </label>
        <AuthHiba
          hiba={message?.state === "error" ? message.error : null}
          data-testid="register-error"
        />
        <AuthGomb data-testid="register-button">Fiók létrehozása</AuthGomb>
      </form>
      <AuthValto
        mondat="Már van fiókod?"
        gomb="Bejelentkezés"
        onClick={() => setCurrentView(LOGIN_VIEW.SIGN_IN)}
        data-testid="sign-in-link"
      />
    </AuthKartya>
  )
}

export default Register
