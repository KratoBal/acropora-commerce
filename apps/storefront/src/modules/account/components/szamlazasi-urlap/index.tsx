"use client"

import { useActionState, useState } from "react"

import { saveBilling } from "@lib/data/customer"
import {
  ADOSZAM_METADATA_KULCS,
  type SzamlazasiTipus,
} from "@lib/util/szamlazas"
import { HttpTypes } from "@medusajs/types"

import { AuthHiba, AuthMezo } from "../auth"

/**
 * A SZAMLAZASI ADATOK (P5, 257:134; mobilon 257:285). Feher, keretes kartya
 * 20 px-es margoval (mobilon kartya nelkul), felul a Magánszemély / Cég
 * valaszto (257:135), alatta a mezok es egy "Mentés".
 *
 * Eltérés a kerettol: a keret EGY "Számlázási cím" mezot mutat ("Budapest,
 * Minta utca 12."); a Medusa a varost es az utcat kulon tarolja, es egy mezo
 * szetvagasa talalgatas lenne, ezert ket mezo all. Maganszemelynel a Cégnév
 * es az Adószám nem latszik: a keret csak a ceges valtozatot mutatja.
 */
export default function SzamlazasiUrlap({
  cim,
}: {
  cim: HttpTypes.StoreCustomerAddress | null
}) {
  const [allapot, mentes] = useActionState(saveBilling, null)
  // Hibas bekuldes utan a mezok a bekuldott erteket kapjak vissza (a React 19
  // az action utan alaphelyzetbe allitja az urlapot).
  const beirt = allapot?.state === "error" ? allapot.ertekek : undefined
  const ertek = (nev: string, mentett: string | null | undefined) =>
    beirt?.[nev] ?? mentett ?? ""
  const eredetiAdoszam = cim?.metadata?.[ADOSZAM_METADATA_KULCS]
  const [tipus, setTipus] = useState<SzamlazasiTipus>(
    cim?.company || typeof eredetiAdoszam === "string" ? "ceg" : "maganszemely",
  )

  const valaszto = (ertek: SzamlazasiTipus, felirat: string) => (
    <label
      className={
        "flex h-[33px] cursor-pointer items-center border px-[10px] text-[11.5px] leading-[15px] text-acr-ink has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:[outline-color:var(--acr-color-heritage)] small:h-[36px] small:px-3 small:text-[12.5px] small:leading-[16px] " +
        (tipus === ertek
          ? "border-acr-heritage font-semibold"
          : "border-acr-line")
      }
    >
      <input
        type="radio"
        name="tipus_valaszto"
        value={ertek}
        checked={tipus === ertek}
        onChange={() => setTipus(ertek)}
        className="sr-only"
        data-testid={`tipus-${ertek}`}
      />
      {felirat}
    </label>
  )

  return (
    <form
      action={mentes}
      className="flex max-w-[842px] flex-col gap-3 font-acr-sans small:gap-[14px] small:border small:border-acr-line small:bg-acr-white small:p-5"
      data-testid="szamlazas-urlap"
    >
      {/*
        A TIPUST EZ A REJTETT MEZO KULDI, a React allapotabol. A radiok csak az
        allapotot vezerlik: a React 19 az action utan alaphelyzetbe allitja az
        urlapot, es a radio DOM-allapota ilyenkor a kezdo erteke ugrik vissza,
        mikozben a felulet mar Céget mutat (mérve a stage ellen, 2026-09-29:
        a Cégként mentett adat maganszemelykent ment el).
      */}
      <input type="hidden" name="tipus" value={tipus} />
      <fieldset className="flex gap-2">
        <legend className="sr-only">Számlázás típusa</legend>
        {valaszto("maganszemely", "Magánszemély")}
        {valaszto("ceg", "Cég")}
      </fieldset>
      {tipus === "ceg" ? (
        <AuthMezo
          cimke="Cégnév"
          name="company"
          required
          autoComplete="organization"
          defaultValue={ertek("company", cim?.company)}
          data-testid="company-input"
        />
      ) : null}
      <div className="grid gap-3 small:grid-cols-2">
        {tipus === "ceg" ? (
          <AuthMezo
            cimke="Adószám"
            name="tax_id"
            required
            inputMode="numeric"
            placeholder="12345678-1-23"
            defaultValue={ertek(
              "tax_id",
              typeof eredetiAdoszam === "string" ? eredetiAdoszam : "",
            )}
            data-testid="tax-id-input"
          />
        ) : null}
        <AuthMezo
          cimke="Irányítószám"
          name="postal_code"
          required
          inputMode="numeric"
          autoComplete="postal-code"
          defaultValue={ertek("postal_code", cim?.postal_code)}
          data-testid="postal-code-input"
        />
      </div>
      <div className="grid gap-3 small:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <AuthMezo
          cimke="Város"
          name="city"
          required
          autoComplete="address-level2"
          defaultValue={ertek("city", cim?.city)}
          data-testid="city-input"
        />
        <AuthMezo
          cimke="Utca, házszám"
          name="address_1"
          required
          autoComplete="address-line1"
          defaultValue={ertek("address_1", cim?.address_1)}
          data-testid="address-1-input"
        />
      </div>
      <AuthHiba
        hiba={allapot?.state === "error" ? allapot.error : null}
        data-testid="szamlazas-hiba"
      />
      <div className="flex flex-col gap-2 small:flex-row small:items-center small:gap-4">
        <button
          type="submit"
          className="flex h-[46px] w-full items-center justify-center bg-acr-heritage text-[13.5px] font-semibold text-acr-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)] small:h-[44px] small:w-[180px]"
          data-testid="szamlazas-mentes"
        >
          Mentés
        </button>
        <p
          role="status"
          className="text-[13px] leading-[18px] text-acr-slate"
          data-testid="szamlazas-siker"
        >
          {allapot?.state === "success" ? "Mentve." : ""}
        </p>
      </div>
    </form>
  )
}
