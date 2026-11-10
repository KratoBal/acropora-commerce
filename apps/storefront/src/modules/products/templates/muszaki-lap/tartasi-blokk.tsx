import { translator, type Translate } from "@lib/i18n/dictionary"
import { DEFAULT_LOCALE, type Locale } from "@lib/i18n/locale"
import {
  ELO_ALLAT_FIGYELMEZTETES,
  FELIRATOK,
  HIANYZO_ADAT,
  KORALLOS_FELIRAT,
  NEHEZSEG_SKALA,
  tartasiAdat,
  type TartasiAdat,
} from "@lib/util/tartasi-adat"
import React from "react"

/**
 * A TARTASI ADATOK BLOKK AZ ELO ALLAT TERMEKLAPJAN (V2.2 S4, kartya d2fc06e7; a spec 3. pontja). Az adat az OS vetiteseben
 * jon (`metadata.husbandry`, murena S3); amig nincs, vagy egy tenye nincs, a hely "Ellenőrzés alatt..." szoveget kap,
 * soha nem ures cellat es soha nem kitalalt erteket. Szam csak abbol, amit az OS ellenorzottkent kiadott.
 *
 * A felepites a spec szerint: osszefoglalo sor (nehezseg, minimalis medence, korallos akvariumban tarthato, etetes, feny es
 * aramlas), reszletek, "Kinek ajanljuk / nem ajanljuk", "Vasarlas elott", a 3. es 4. fokozat fix mondata, es alul az elo
 * allat figyelmeztetes.
 */
export function TartasiBlokk({
  metadata,
  locale = DEFAULT_LOCALE,
}: {
  metadata: Record<string, unknown> | null | undefined
  locale?: Locale
}) {
  const t = translator(locale)
  const adat = tartasiAdat(metadata)
  const nehezseg = adat?.difficulty ? NEHEZSEG_SKALA[adat.difficulty] : null
  const sor = (cimke: string, ertek: string | null, kulcs: string) => (
    <div key={kulcs} data-testid={`tartas-${kulcs}`}>
      <dt className="text-xsmall-regular uppercase">{cimke}</dt>
      <dd>{ertek ?? HIANYZO_ADAT}</dd>
    </div>
  )
  const reszletek = adat ? reszletSorok(adat, t) : []

  return (
    <section
      data-testid="tartasi-blokk"
      className="mt-6 flex flex-col gap-4 text-small-regular text-[var(--terv-szoveg-halvany)]"
    >
      <h3 className="text-base-semi">{t("product.husbandryTitle")}</h3>
      {!adat ? (
        <p data-testid="tartas-hianyzik">{HIANYZO_ADAT}</p>
      ) : (
        <>
          <dl
            data-testid="tartas-osszefoglalo"
            className="grid grid-cols-2 gap-3 small:grid-cols-5"
          >
            {sor(
              t("product.husbandryDifficulty"),
              nehezseg?.felirat ?? null,
              "nehezseg",
            )}
            {sor(
              t("product.husbandryMinTank"),
              adat.minLiter !== null ? `${adat.minLiter} l` : null,
              "medence",
            )}
            {sor(KORALLOS_FELIRAT, korallos(adat), "korallos")}
            {sor(
              t("product.husbandryFeeding"),
              adat.feeding.length
                ? adat.feeding.map((f) => FELIRATOK.etetes[f]).join(", ")
                : null,
              "etetes",
            )}
            {sor(
              t("product.husbandryLightFlow"),
              adat.light || adat.flow
                ? `${adat.light ? FELIRATOK.igeny[adat.light] : "?"} / ${adat.flow ? FELIRATOK.igeny[adat.flow] : "?"}`
                : null,
              "feny-aramlas",
            )}
          </dl>
          {nehezseg ? (
            <p data-testid="tartas-kriterium">
              {nehezseg.kriterium}
              {nehezseg.megjegyzes ? (
                <span
                  data-testid="tartas-megjegyzes"
                  className="mt-1 block font-semibold"
                >
                  {nehezseg.megjegyzes}
                </span>
              ) : null}
            </p>
          ) : null}
          {reszletek.length ? (
            <dl
              data-testid="tartas-reszletek"
              className="grid grid-cols-2 gap-3"
            >
              {reszletek.map(([kulcs, cimke, ertek]) =>
                sor(cimke, ertek, kulcs),
              )}
            </dl>
          ) : null}
          <div data-testid="tartas-kinek" className="flex flex-col gap-1">
            <p>
              <span className="font-semibold">
                {t("product.husbandryForWhom")}
              </span>{" "}
              {nehezseg
                ? `${nehezseg.felirat}: ${nehezseg.kriterium}`
                : HIANYZO_ADAT}
            </p>
            <p>
              <span className="font-semibold">
                {t("product.husbandryNotForWhom")}
              </span>{" "}
              {adat.notFor ?? HIANYZO_ADAT}
            </p>
          </div>
          <div data-testid="tartas-vasarlas-elott">
            <p className="font-semibold">
              {t("product.husbandryBeforeBuying")}
            </p>
            <ul className="list-disc pl-5">
              <li>
                {t("product.husbandryBeforeTank", {
                  liter:
                    adat.minLiter !== null
                      ? `${adat.minLiter} l`
                      : HIANYZO_ADAT,
                })}
              </li>
              <li>{t("product.husbandryBeforeCompat")}</li>
              <li>{t("product.husbandryBeforeQuarantine")}</li>
            </ul>
          </div>
          {adat.verifiedOn ? (
            <p className="text-xsmall-regular">
              {t("product.husbandryVerifiedOn", { day: adat.verifiedOn })}
            </p>
          ) : null}
        </>
      )}
      <p data-testid="tartas-elo-allat" className="font-semibold">
        {ELO_ALLAT_FIGYELMEZTETES}
      </p>
    </section>
  )
}

function korallos(adat: TartasiAdat): string | null {
  if (!adat.reefSafe) return null
  const ertek = FELIRATOK.korallos[adat.reefSafe]
  return adat.reefSafeReason ? `${ertek} (${adat.reefSafeReason})` : ertek
}

/** The details: only what is meaningful for the kind; a missing fact stays a row with the missing text. */
function reszletSorok(
  adat: TartasiAdat,
  t: Translate,
): [string, string, string | null][] {
  const igenNem = (v: boolean | null) =>
    v === null ? null : v ? t("product.husbandryYes") : t("product.husbandryNo")
  const sorok: [string, string, string | null][] = [
    [
      "erettseg",
      t("product.husbandryMaturity"),
      adat.maturityMonths !== null ? `${adat.maturityMonths} hónap` : null,
    ],
  ]
  if (adat.kind === "coral")
    sorok.push([
      "zona",
      t("product.husbandryPlacement"),
      adat.placementZone ? FELIRATOK.zona[adat.placementZone] : null,
    ])
  if (adat.kind !== "coral") {
    sorok.push(
      [
        "tarsas",
        t("product.husbandrySocial"),
        adat.social ? FELIRATOK.tarsas[adat.social] : null,
      ],
      [
        "viselkedes",
        t("product.husbandryTemper"),
        adat.aggression.length
          ? adat.aggression.map((a) => FELIRATOK.agresszio[a]).join(", ")
          : null,
      ],
      ["korallevo", t("product.husbandryCoralEater"), igenNem(adat.coralEater)],
      [
        "gerinctelenevo",
        t("product.husbandryInvertebrateEater"),
        igenNem(adat.invertebrateEater),
      ],
    )
  }
  sorok.push(
    ["gyakorisag", t("product.husbandryFrequency"), adat.feedingFrequency],
    ["elo-eleseg", t("product.husbandryLiveFood"), igenNem(adat.liveFood)],
    [
      "meret",
      t("product.husbandryMaxSize"),
      adat.maxSize
        ? `${adat.maxSize.value} cm (${FELIRATOK.dimenzio[adat.maxSize.dimension]})`
        : null,
    ],
    [
      "szarmazas",
      t("product.husbandrySourcing"),
      adat.sourcing ? FELIRATOK.szarmazas[adat.sourcing] : null,
    ],
  )
  return sorok
}
