"use client"

import { translator } from "@lib/i18n/dictionary"
import { DEFAULT_LOCALE, type Locale } from "@lib/i18n/locale"
import { adagOlvas, adagSzamol, literOlvas } from "@lib/util/adagolas"
import {
  adagSzoveg,
  gyakorisagSzoveg,
  gyartoiAdagSzoveg,
  literAllapot,
  szam,
} from "@lib/util/adagolas-szoveg"
import React, { useEffect, useId, useRef, useState } from "react"

/**
 * AZ ADAGOLO-KALKULATOR A MUSZAKI LAPON (V3.1, kartya 7fdbb15d). A muszaki lap
 * csak VERIFIED dosing tenynel rajzolja; a kanonikus alak itt is ujra
 * olvasodik, es ha nem az, a doboz nem jelenik meg (a teny ilyenkor ugy all a
 * lapon, ahogy eddig).
 *
 * A szam SOHA nem nagyobb a gyartoi aranynal (`adagSzamol` lefele kerekit):
 * 1 csepp vagy 0,1 ml alatt szam helyett a pontos ertek es a gyartoi utmutato
 * all; ha a lefele kerekites 20 szazaleknal tobbet vesz el, a pontos ertek is.
 */
export function AdagoloKalkulator({
  ertek,
  locale = DEFAULT_LOCALE,
  letiltva = false,
}: {
  /** a dosing teny erteke, ahogy a vetites hozza */
  ertek: string
  locale?: Locale
  /**
   * A LAP SUSPENSE-TARTALEKABAN ALLO PELDANY (acrobot 50250): a streamelt csere elott a tartalek mar latszik, de a csere
   * lecsereli, es ami bele van irva, elveszik. Ott a mezo letiltott; a valodi peldany a csere utan gepelheto.
   */
  letiltva?: boolean
}) {
  const t = translator(locale)
  const mezoId = useId()
  const [beirt, setBeirt] = useState("")
  const eredmenyRef = useRef<HTMLDivElement>(null)
  const hibaRef = useRef<HTMLParagraphElement>(null)
  /*
    AZ EREDMENY NE A RAGADOS KOSAR-SAV ALATT ALLJON (acrobot 50206, a teszt kirakat 390 pixeles kepe, 2026-11-13). Mobilon a
    sav a nezet aljan tapad, az eredmeny a liter-mezo ALATT van: ha a mezo eppen a sav folott all, a bongeszo nem gorget (a
    mezo latszik), es az eredmeny a sav moge kerul. Minden beiraskor a legkozelebbi helyre gorgetjuk, a `scroll-margin`
    pedig a sav magassagat hagyja alatta; ha az eredmeny mar latszik, a lap nem mozdul.
  */
  useEffect(() => {
    if (beirt !== "")
      (eredmenyRef.current ?? hibaRef.current)?.scrollIntoView?.({
        block: "nearest",
      })
  }, [beirt])
  const adag = adagOlvas(ertek)
  if (!adag) return null

  const allapot = beirt === "" ? null : literAllapot(beirt, literOlvas)
  const szamolt =
    allapot && "liter" in allapot ? adagSzamol(adag, allapot.liter) : null
  const hiba =
    allapot && "hiba" in allapot
      ? {
          ures: t("product.doseCalc.errorEmpty"),
          nemSzam: t("product.doseCalc.errorNotNumber"),
          nemPozitiv: t("product.doseCalc.errorNotPositive"),
          tulNagy: t("product.doseCalc.warnLarge"),
        }[allapot.hiba]
      : null
  const pontos = szamolt
    ? // a pontos ertek is LEFELE ket tizedesre (barracuda, #682 a): 0,996 csepp ne "1 csepp"-kent alljon a
      // "tul keves" mondatban; a kis epszilon a lebegopontos szorzas ellen van, mint az adagSzamol-ban
      adagSzoveg(
        Math.floor(szamolt.pontos * 100 + 1e-9) / 100,
        adag.egyseg,
        t,
        locale,
      )
    : ""

  return (
    <div
      data-testid="adagolo-kalkulator"
      className="mt-3 flex flex-col gap-2 rounded-lg border border-[var(--terv-vonal,#e5e7eb)] p-4"
    >
      <h3 className="text-base-semi">{t("product.doseCalc.title")}</h3>
      <label htmlFor={mezoId} className="text-small-regular">
        {t("product.doseCalc.volumeLabel")}
      </label>
      <div className="flex items-center gap-2">
        <input
          id={mezoId}
          data-testid="adagolo-liter"
          inputMode="decimal"
          autoComplete="off"
          value={beirt}
          disabled={letiltva}
          placeholder={t("product.doseCalc.volumePlaceholder")}
          onChange={(event) => setBeirt(event.target.value)}
          className="w-32 rounded-md border border-[var(--terv-vonal,#e5e7eb)] px-3 py-2"
        />
        <span>{t("product.doseCalc.volumeUnit")}</span>
      </div>
      {beirt === "" ? (
        <p className="text-xsmall-regular">
          {t("product.doseCalc.hintDecimal")}
        </p>
      ) : null}
      {hiba ? (
        <p
          // the error stands under the field just like the result (barracuda 50230; the test storefront, 390 px: 20 px
          // under the sticky bar): the same scroll, the same margin; the two are never shown at once
          ref={hibaRef}
          data-testid="adagolo-hiba"
          role="alert"
          className="text-small-regular max-lg:scroll-mb-28"
        >
          {hiba}
        </p>
      ) : null}
      {szamolt && allapot && "liter" in allapot ? (
        <div
          ref={eredmenyRef}
          data-testid="adagolo-eredmeny"
          aria-live="polite"
          className="max-lg:scroll-mb-28"
        >
          {allapot.szokatlan ? (
            <p className="text-small-regular">
              {t("product.doseCalc.warnLarge")}
            </p>
          ) : null}
          {szamolt.tulKicsi ? (
            <p data-testid="adagolo-tul-kicsi">
              {t("product.doseCalc.tooSmall", { exact: pontos })}
            </p>
          ) : (
            <>
              <p data-testid="adagolo-adag">
                {t("product.doseCalc.resultLead", {
                  volume: szam(allapot.liter, locale),
                })}{" "}
                <strong>
                  {adagSzoveg(szamolt.adag, szamolt.egyseg, t, locale)}
                </strong>{" "}
                {t("product.doseCalc.resultTail", {
                  frequency: gyakorisagSzoveg(adag, t),
                })}
              </p>
              {szamolt.pontosIsKell ? (
                <p data-testid="adagolo-pontos">
                  {t("product.doseCalc.exact", { exact: pontos })}
                </p>
              ) : null}
            </>
          )}
        </div>
      ) : null}
      <p className="text-small-regular" data-testid="adagolo-gyarto">
        {t("product.doseCalc.manufacturer", {
          dose: gyartoiAdagSzoveg(adag, t, locale),
        })}
      </p>
      <p className="text-xsmall-regular">{t("product.doseCalc.warning")}</p>
    </div>
  )
}
