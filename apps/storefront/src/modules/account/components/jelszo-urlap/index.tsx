"use client"

import { useActionState } from "react"

import { changePassword } from "@lib/data/customer"

import { AuthHiba, AuthMezo } from "../auth"

/**
 * A JELSZO MODOSITASA (P5, 257:191; mobilon 257:320): feher, keretes kartya
 * 20 px-es margoval (mobilon kartya nelkul), cim, harom jelszo mezo es egy
 * "Jelszó mentése".
 *
 * A mezok minden bekuldes utan uresek: a React 19 alaphelyzetbe allitja az
 * urlapot, es jelszo soha nem jon vissza a szerverrol (a #418 szabalya). A
 * keret nem mutat sikeruzenetet; a "Mentve." sor mintajara itt all egy, mert
 * kiurult mezok mellett kulonben nem latszana, hogy megtortent.
 */
export default function JelszoUrlap() {
  const [allapot, mentes] = useActionState(changePassword, null)

  return (
    <form
      action={mentes}
      className="flex max-w-[842px] flex-col gap-3 font-acr-sans small:gap-[14px] small:border small:border-acr-line small:bg-acr-white small:p-5"
      data-testid="jelszo-urlap"
    >
      <h2 className="text-[17px] font-semibold leading-[22px] text-acr-ink small:text-[20px] small:leading-[26px]">
        Jelszó módosítása
      </h2>
      <AuthMezo
        cimke="Jelenlegi jelszó"
        name="current_password"
        type="password"
        required
        autoComplete="current-password"
        data-testid="current-password-input"
      />
      <AuthMezo
        cimke="Új jelszó"
        name="new_password"
        type="password"
        required
        autoComplete="new-password"
        data-testid="new-password-input"
      />
      <AuthMezo
        cimke="Új jelszó újra"
        name="new_password_again"
        type="password"
        required
        autoComplete="new-password"
        data-testid="new-password-again-input"
      />
      <AuthHiba
        hiba={allapot?.state === "error" ? allapot.error : null}
        data-testid="jelszo-hiba"
      />
      <div className="flex flex-col gap-2 small:flex-row small:items-center small:gap-4">
        <button
          type="submit"
          className="flex h-[46px] w-full items-center justify-center bg-acr-heritage text-[13.5px] font-semibold text-acr-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)] small:h-[44px] small:w-[180px]"
          data-testid="jelszo-mentes"
        >
          Jelszó mentése
        </button>
        <p
          role="status"
          className="text-[13px] leading-[18px] text-acr-slate"
          data-testid="jelszo-siker"
        >
          {allapot?.state === "success" ? "A jelszó megváltozott." : ""}
        </p>
      </div>
    </form>
  )
}
