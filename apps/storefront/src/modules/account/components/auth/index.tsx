"use client"

import React from "react"
import { useFormStatus } from "react-dom"

/**
 * A BELEPES ES A REGISZTRACIO KOZOS ELEMEI (P5, 256:3 / 256:36, mobilon
 * 256:103 / 256:124).
 *
 * Asztalon (`small`-tol) feher, keretes, 500 px-es kartya a lap kozepen,
 * 36/40 px-es belso margoval; mobilon nincs kartya, a tartalom a lap alapjan
 * all. A keret sajat mobil-fejlece (vissza-nyil es logo) nem epul: a fejlec a
 * P1b-ben kanonikus.
 */
export function AuthKartya({
  cim,
  leiras,
  mobilLeiras,
  children,
  "data-testid": testId,
}: {
  cim: string
  leiras: string
  /** A keret mobilon rovidebb mondatot ir (256:109, 256:130). */
  mobilLeiras: string
  children: React.ReactNode
  "data-testid"?: string
}) {
  return (
    <div className="flex w-full justify-center bg-acr-shell px-4 pb-10 pt-[26px] font-acr-sans small:min-h-[720px] small:items-center small:py-[96px]">
      <div
        className="flex w-full flex-col gap-[14px] small:max-w-[500px] small:border small:border-acr-line small:bg-acr-white small:px-10 small:py-9"
        data-testid={testId}
      >
        <p className="hidden text-[10.5px] font-semibold uppercase leading-[14px] tracking-[1.1px] text-acr-heritage small:block">
          Fiók
        </p>
        <h1 className="text-[26px] font-semibold leading-[34px] text-acr-ink small:text-[30px] small:leading-[39px]">
          {cim}
        </h1>
        {/* A keretben a leiras 40 px-es doboz (256:21, 256:109): a mezok ettol kezdodnek lejjebb. */}
        <p className="min-h-[40px] text-[13px] leading-[19px] text-acr-slate small:text-[13.5px]">
          <span className="small:hidden">{mobilLeiras}</span>
          <span className="hidden small:inline">{leiras}</span>
        </p>
        {children}
      </div>
    </div>
  )
}

/** Egy mezo: 12.5 px-es cimke folott 48 (mobilon 46) px-es beviteli doboz. */
export function AuthMezo({
  cimke,
  ...input
}: { cimke: string } & React.InputHTMLAttributes<HTMLInputElement> & {
    "data-testid"?: string
  }) {
  const id = `auth-${input.name}`
  return (
    <div className="flex flex-col gap-[5px]">
      <label
        htmlFor={id}
        className="text-[12.3px] leading-[16px] text-acr-slate small:text-[12.5px]"
      >
        {cimke}
      </label>
      <input
        id={id}
        {...input}
        className="h-[46px] border border-acr-line bg-acr-shell px-3 text-[13.5px] leading-[18px] text-acr-ink outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)] small:h-[48px] small:text-[14px]"
      />
    </div>
  )
}

/** A fo gomb (256:33): rez, 50 (mobilon 48) px, 600/14.5. */
export function AuthGomb({
  children,
  "data-testid": testId,
}: {
  children: React.ReactNode
  "data-testid"?: string
}) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className="flex h-[48px] w-full items-center justify-center bg-acr-heritage text-[13.8px] font-semibold text-acr-white disabled:opacity-70 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)] small:h-[50px] small:text-[14.5px]"
      data-testid={testId}
    >
      {children}
    </button>
  )
}

/**
 * Hibauzenet a gomb folott; kepernyoolvasonak is bejelentve. A Foundations
 * palettaban nincs hibaszin, ezert nem talalunk ki pirosat: tinta, 500. A
 * hibaallapot sajat alakja a P6 (szelso allapotok) dolga.
 */
export function AuthHiba({
  hiba,
  "data-testid": testId,
}: {
  hiba?: string | null
  "data-testid"?: string
}) {
  if (!hiba) return null
  return (
    <p
      role="alert"
      className="text-[12.5px] font-medium leading-[16px] text-acr-ink"
      data-testid={testId}
    >
      {hiba}
    </p>
  )
}

/** Az also sor (256:35): a mondat es a masik nezet gombja, 12.5 px, pala. */
export function AuthValto({
  mondat,
  gomb,
  onClick,
  "data-testid": testId,
}: {
  mondat: string
  gomb: string
  onClick: () => void
  "data-testid"?: string
}) {
  return (
    <p className="text-[12.3px] leading-[16px] text-acr-slate small:text-[12.5px]">
      {mondat}{" "}
      <button
        type="button"
        onClick={onClick}
        className="underline underline-offset-2 hover:text-acr-ink"
        data-testid={testId}
      >
        {gomb}
      </button>
    </p>
  )
}
