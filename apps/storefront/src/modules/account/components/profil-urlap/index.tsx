"use client"

import { useActionState } from "react"

import { saveProfile } from "@lib/data/customer"
import { HttpTypes } from "@medusajs/types"

import { AuthHiba, AuthMezo } from "../auth"

/**
 * A PROFIL (P5, 257:35; mobilon 257:228): feher, keretes kartya 20 px-es
 * margoval, egy "Mentés" gombbal.
 *
 * Eltérések a kerettol, mindketto adatbol: a nev KET mezo (a Medusa vevo es a
 * szamla kulon tartja, mint a regisztracional), es az e-mail CSAK OLVASHATO,
 * mert a bolti API nem engedi modositani. A szamlazasi cim a Számlázási
 * adatok lapra kerul (P5 5. pont).
 */
export default function ProfilUrlap({
  customer,
}: {
  customer: HttpTypes.StoreCustomer
}) {
  const [allapot, mentes] = useActionState(saveProfile, null)
  // After a failed save the fields keep what was typed, not the saved values:
  // React 19 resets the form after the action.
  const beirt = allapot?.state === "error" ? allapot.ertekek : undefined

  return (
    <form
      action={mentes}
      className="flex max-w-[842px] flex-col gap-3 font-acr-sans small:gap-[14px] small:border small:border-acr-line small:bg-acr-white small:p-5"
      data-testid="profile-page-wrapper"
    >
      <div className="grid gap-3 small:grid-cols-2">
        <AuthMezo
          cimke="Vezetéknév"
          name="last_name"
          required
          autoComplete="family-name"
          defaultValue={beirt?.last_name ?? customer.last_name ?? ""}
          data-testid="last-name-input"
        />
        <AuthMezo
          cimke="Keresztnév"
          name="first_name"
          required
          autoComplete="given-name"
          defaultValue={beirt?.first_name ?? customer.first_name ?? ""}
          data-testid="first-name-input"
        />
      </div>
      <div className="grid gap-3 small:grid-cols-2">
        <div className="flex flex-col gap-[5px]">
          <AuthMezo
            cimke="E-mail"
            name="email"
            type="email"
            readOnly
            aria-describedby="profil-email-megjegyzes"
            defaultValue={customer.email ?? ""}
            data-testid="email-input"
          />
          <p
            id="profil-email-megjegyzes"
            className="text-[12px] leading-[16px] text-acr-slate"
          >
            Az e-mail-cím itt nem módosítható.
          </p>
        </div>
        <AuthMezo
          cimke="Telefonszám"
          name="phone"
          type="tel"
          autoComplete="tel"
          defaultValue={beirt?.phone ?? customer.phone ?? ""}
          data-testid="phone-input"
        />
      </div>
      <AuthHiba
        hiba={allapot?.state === "error" ? allapot.error : null}
        data-testid="profile-error"
      />
      <div className="flex flex-col gap-2 small:flex-row small:items-center small:gap-4">
        <button
          type="submit"
          className="flex h-[46px] w-full items-center justify-center bg-acr-heritage text-[13.5px] font-semibold text-acr-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)] small:h-[44px] small:w-[180px]"
          data-testid="profile-save-button"
        >
          Mentés
        </button>
        <p
          role="status"
          className="text-[13px] leading-[18px] text-acr-slate"
          data-testid="profile-success"
        >
          {allapot?.state === "success" ? "Mentve." : ""}
        </p>
      </div>
    </form>
  )
}
