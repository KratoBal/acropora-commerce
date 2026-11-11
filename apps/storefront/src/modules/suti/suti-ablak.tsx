"use client"

import Link from "next/link"
import { useParams, usePathname } from "next/navigation"
import { useEffect, useState } from "react"

import { sutiDontesRogzitese } from "@lib/data/suti-hozzajarulas"
import { useTranslate } from "@lib/i18n/use-translate"
import { jogiOldal } from "@lib/util/fogyasztobarat"
import { elonezetiUt } from "@lib/util/kezdolap-elonezet"
import {
  consentJelek,
  olvasDontes,
  SUTI_BEALLITAS_ESEMENY,
  SUTI_HOZZAJARULAS_VERZIO,
  sutiSor,
  type SutiDontes,
} from "@lib/util/suti-hozzajarulas"

type Nezet = "zarva" | "savos" | "beallitasok"

/**
 * A SUTI-HOZZAJARULAS ABLAKA (kartya d5515c7d), minden lapon, a gyoker
 * layoutbol.
 *
 * NEM MODALIS: also sav, `role="region"`, fokusz-csapda nelkul (a fejlec-menu
 * tanulsaga: egy `role="dialog"` elkulonult feladatot igerne a felolvasonak).
 * A lap a sav mogott hasznalhato marad.
 *
 * HAROM EGYENRANGU GOMB: az elutasitas ugyanolyan konnyu, mint az elfogadas,
 * es ugyanolyan feltuno. A Beallitasokban a ket valaszthato kategoria alapbol
 * KI (az elozo dontes, ha van).
 *
 * A DONTES A SUTIBE megy (`sutiSor`), a Consent Mode jelei rogton frissulnek
 * (`gtag("consent","update")`, a `<head>` szkriptje definialta), es
 * bejelentkezett vevonel a szerverre is (`sutiDontesRogzitese`); ennek a
 * hibaja a helyi dontest nem allitja meg.
 *
 * ELSO RENDERELESKOR NINCS SEMMI: a suti csak a bongeszoben olvashato, es a
 * lapok ISR-ek, ezert a sav a csatolas utan jelenik meg, ha kell.
 *
 * Az OS-beli kezdolap-elonezetben nem jelenik meg (`elonezetiUt`).
 */
export default function SutiAblak() {
  const t = useTranslate()
  const pathname = usePathname() ?? ""
  const szegmens = String(useParams()?.countryCode ?? "hu")
  const [nezet, setNezet] = useState<Nezet>("zarva")
  const [statisztika, setStatisztika] = useState(false)
  const [marketing, setMarketing] = useState(false)

  useEffect(() => {
    const meglevo = olvasDontes(document.cookie)
    if (meglevo) {
      setStatisztika(meglevo.statisztika)
      setMarketing(meglevo.marketing)
    } else {
      setNezet("savos")
    }
    const megnyit = () => {
      const most = olvasDontes(document.cookie)
      setStatisztika(!!most?.statisztika)
      setMarketing(!!most?.marketing)
      setNezet("beallitasok")
    }
    window.addEventListener(SUTI_BEALLITAS_ESEMENY, megnyit)
    return () => window.removeEventListener(SUTI_BEALLITAS_ESEMENY, megnyit)
  }, [])

  if (nezet === "zarva" || elonezetiUt(pathname)) return null

  const ment = (valasz: { statisztika: boolean; marketing: boolean }) => {
    const dontes: SutiDontes = {
      verzio: SUTI_HOZZAJARULAS_VERZIO,
      idopont: new Date().toISOString(),
      ...valasz,
    }
    document.cookie = sutiSor(dontes, window.location.protocol === "https:")
    const gtag = (window as { gtag?: (...a: unknown[]) => void }).gtag
    gtag?.("consent", "update", consentJelek(dontes))
    setStatisztika(valasz.statisztika)
    setMarketing(valasz.marketing)
    setNezet("zarva")
    void sutiDontesRogzitese(valasz).catch(() => undefined)
  }

  const gomb = "h-11 px-5 txt-small-plus uppercase tracking-wide border"
  const gombStilus = {
    background: "var(--terv-kiemel)",
    color: "var(--terv-kiemel-szoveg)",
    borderColor: "var(--terv-kiemel)",
  }

  return (
    <section
      role="region"
      aria-labelledby="suti-ablak-cim"
      data-testid="suti-ablak"
      data-nezet={nezet}
      className="fixed inset-x-0 bottom-0 z-[60] border-t shadow-lg"
      style={{
        background: "var(--terv-hatter)",
        borderColor: "var(--terv-keret)",
      }}
    >
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 lg:px-16">
        <h2 id="suti-ablak-cim" className="txt-large-plus">
          {t("cookieConsent.title")}
        </h2>
        <p className="txt-small max-w-[900px]">
          {t("cookieConsent.text")}{" "}
          <Link
            className="underline"
            href={`/${szegmens}${jogiOldal("adatkezeles")}`}
            data-testid="suti-adatkezeles-link"
          >
            {t("cookieConsent.privacyLink")}
          </Link>
          {" · "}
          <Link
            className="underline"
            href={`/${szegmens}${jogiOldal("suti")}`}
            data-testid="suti-tajekoztato-link"
          >
            {t("cookieConsent.cookieLink")}
          </Link>
        </p>

        {nezet === "beallitasok" ? (
          <fieldset
            className="flex flex-col gap-3"
            data-testid="suti-beallitasok"
          >
            <legend className="sr-only">{t("cookieConsent.settings")}</legend>
            <label className="flex items-start gap-2 txt-small">
              <input type="checkbox" checked disabled className="mt-1" />
              <span>
                <strong>{t("cookieConsent.necessary")}</strong>
                {": "}
                {t("cookieConsent.necessaryText")}
              </span>
            </label>
            <label className="flex items-start gap-2 txt-small">
              <input
                type="checkbox"
                className="mt-1"
                checked={statisztika}
                onChange={(e) => setStatisztika(e.target.checked)}
                data-testid="suti-statisztika"
              />
              <span>
                <strong>{t("cookieConsent.statistics")}</strong>
                {": "}
                {t("cookieConsent.statisticsText")}
              </span>
            </label>
            <label className="flex items-start gap-2 txt-small">
              <input
                type="checkbox"
                className="mt-1"
                checked={marketing}
                onChange={(e) => setMarketing(e.target.checked)}
                data-testid="suti-marketing"
              />
              <span>
                <strong>{t("cookieConsent.marketing")}</strong>
                {": "}
                {t("cookieConsent.marketingText")}
              </span>
            </label>
          </fieldset>
        ) : null}

        <div className="flex flex-col gap-2 small:flex-row">
          <button
            type="button"
            className={gomb}
            style={gombStilus}
            onClick={() => ment({ statisztika: true, marketing: true })}
            data-testid="suti-mindet"
          >
            {t("cookieConsent.acceptAll")}
          </button>
          <button
            type="button"
            className={gomb}
            style={gombStilus}
            onClick={() => ment({ statisztika: false, marketing: false })}
            data-testid="suti-szukseges"
          >
            {t("cookieConsent.necessaryOnly")}
          </button>
          {nezet === "beallitasok" ? (
            <button
              type="button"
              className={gomb}
              style={gombStilus}
              onClick={() => ment({ statisztika, marketing })}
              data-testid="suti-mentes"
            >
              {t("cookieConsent.save")}
            </button>
          ) : (
            <button
              type="button"
              className={gomb}
              style={gombStilus}
              onClick={() => setNezet("beallitasok")}
              data-testid="suti-beallitasok-gomb"
            >
              {t("cookieConsent.settings")}
            </button>
          )}
        </div>
      </div>
    </section>
  )
}
