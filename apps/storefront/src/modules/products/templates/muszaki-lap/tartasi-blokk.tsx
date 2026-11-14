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
 * A felepites a spec szerint: osszefoglalo sor (nehezseg, minimalis medence vagy korallnal elhelyezes, korallos akvariumban tarthato, etetes, feny es
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
  const hely = adat ? helyCella(adat) : { zona: false }
  const reszletek = adat
    ? [...reszletSorok(adat, hely.zona, t), ...opcionalisSorok(adat, t, locale)]
    : []

  return (
    <section
      data-testid="tartasi-blokk"
      className="mt-6 flex flex-col gap-4 text-small-regular text-[var(--terv-szoveg-halvany)]"
    >
      <h2 className="text-base-semi">{t("product.husbandryTitle")}</h2>
      {/*
        A CSIPES VAGY MEREG ELSOKENT ES JOL LATHATOAN (barracuda 46247, acrobot 46248): a blokk tetejen, a nehezseg elott,
        a kezelesi figyelmeztetessel. A figyelmeztetes nelkul talalt veszelyt sem rejti el (murena 46232): akkor a
        figyelmeztetes helyen az "ellenorzes alatt" mondat all, a veszely maga latszik.
      */}
      {adat?.stingOrVenom === true ? (
        <div
          role="note"
          data-testid="tartas-veszely"
          className="border-l-4 border-[var(--terv-kiemel)] bg-[var(--terv-doboz-hatter)] p-3 text-[var(--terv-szoveg)]"
        >
          <p className="font-semibold">{t("product.husbandryHazard")}</p>
          <p>{adat.handlingWarning ?? t("product.husbandryHazardNoWarning")}</p>
        </div>
      ) : null}
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
            {hely.zona
              ? sor(
                  t("product.husbandryPlacement"),
                  adat.placementZone
                    ? FELIRATOK.zona[adat.placementZone]
                    : null,
                  "elhelyezes",
                )
              : sor(
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
              <li>{elsoKerdes(adat, hely.zona, t)}</li>
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

/**
 * A "MENNYI HELY, HOL" CELLA (barracuda, #729): a spec 1. pontja szerint korallnal a minimalis medence helyett az elhelyezes
 * all, es az OS (`missingHusbandryFields`) is igy keri: halnal a liter, korallnal a zona, gerinctelennel a liter VAGY a zona.
 * Egy ellenorzott korallon tehat a liter nem "ellenorzes alatt", hanem nem ertelmezett. A gerinctelen a litert mutatja, ha
 * van; ha csak zonaja van, azt; ha egyik sincs, a literre mondja, hogy ellenorzes alatt (az OS is a litert kerte).
 */
function helyCella(adat: TartasiAdat): { zona: boolean } {
  if (adat.kind === "coral") return { zona: true }
  if (adat.kind === "invertebrate")
    return { zona: adat.minLiter === null && adat.placementZone !== null }
  return { zona: false }
}

/** A "Vasarlas elott" elso kerdese: ahol a hely zona, a medence erettsegere kerdez (maturity_months), nem literre. */
function elsoKerdes(adat: TartasiAdat, zona: boolean, t: Translate): string {
  if (!zona)
    return t("product.husbandryBeforeTank", {
      liter: adat.minLiter !== null ? `${adat.minLiter} l` : HIANYZO_ADAT,
    })
  if (adat.maturityMonths === 0) return t("product.husbandryBeforeAnyTank")
  return t("product.husbandryBeforeMature", {
    months:
      adat.maturityMonths !== null
        ? `${adat.maturityMonths} hónap`
        : HIANYZO_ADAT,
  })
}

/**
 * The details. The compatibility rows (social, temper, coral eater, invertebrate eater) stand for EVERY kind: the spec makes
 * them required for all groups, and the OS asks for them whatever the kind (barracuda, #729: a stinging coral's temper is
 * exactly what "does it suit its tank mates and the corals" asks about). A missing fact stays a row with the missing text.
 */
function reszletSorok(
  adat: TartasiAdat,
  zonaFent: boolean,
  t: Translate,
): [string, string, string | null][] {
  const igenNem = (v: boolean | null) =>
    v === null ? null : v ? t("product.husbandryYes") : t("product.husbandryNo")
  const sorok: [string, string, string | null][] = [
    [
      "erettseg",
      t("product.husbandryMaturity"),
      // a 0 hónap ugyanazt mondja, mint a "Vásárlás előtt" sora, ezért ugyanazzal a mondattal (barracuda, #729)
      adat.maturityMonths === 0
        ? t("product.husbandryBeforeAnyTank")
        : adat.maturityMonths !== null
          ? `${adat.maturityMonths} hónap`
          : null,
    ],
  ]
  // a gerinctelen zonaja, ha a fenti cella a litert mutatja (korallnal a zona mar fent all)
  if (adat.kind === "invertebrate" && !zonaFent && adat.placementZone)
    sorok.push([
      "zona",
      t("product.husbandryPlacement"),
      FELIRATOK.zona[adat.placementZone],
    ])
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

/**
 * AZ OPCIONALIS TENYEK SORAI (V2.2 S4b): csak ami ismert. A spec szerint ezek "ha ismert es megbizhato" mezok, tehat a
 * hianyuk nem "ellenorzes alatt" sor (nyolc ilyen sor minden allaton elnyomna a kotelezoket), hanem nincs sor. A csipes
 * vagy mereg igaz erteke nem itt all, hanem a blokk tetejen; a hamis itt, valaszkent.
 */
function opcionalisSorok(
  adat: TartasiAdat,
  t: Translate,
  locale: Locale,
): [string, string, string | null][] {
  const szam = new Intl.NumberFormat(locale === "en" ? "en-GB" : "hu-HU", {
    maximumFractionDigits: 3,
  }).format
  const sav = (r: { min: number; max: number } | null, egyseg: string) =>
    r
      ? `${r.min === r.max ? szam(r.min) : `${szam(r.min)}–${szam(r.max)}`} ${egyseg}`
      : null
  const igenNem = (v: boolean | null) =>
    v === null ? null : v ? t("product.husbandryYes") : t("product.husbandryNo")
  const sorok: [string, string, string | null][] = [
    ["homerseklet", t("product.husbandryTemp"), sav(adat.tempC, "°C")],
    ["sotartalom", t("product.husbandrySalinity"), sav(adat.salinitySg, "SG")],
    ["kh", t("product.husbandryKh"), sav(adat.khDkh, "dKH")],
    [
      "elettartam",
      t("product.husbandryLifespan"),
      adat.lifespanYears !== null
        ? t("product.husbandryYearsN", { n: szam(adat.lifespanYears) })
        : null,
    ],
    [
      "karanten",
      t("product.husbandryQuarantine"),
      adat.quarantineWeeks !== null
        ? t("product.husbandryWeeksN", { n: szam(adat.quarantineWeeks) })
        : null,
    ],
    [
      "akklimatizacio",
      t("product.husbandryAcclimatization"),
      adat.acclimatization,
    ],
    ["szaporitas", t("product.husbandryBreeds"), igenNem(adat.breedsInTank)],
    [
      "csipes",
      t("product.husbandrySting"),
      adat.stingOrVenom === false ? t("product.husbandryNo") : null,
    ],
  ]
  return sorok.filter(([, , ertek]) => ertek !== null)
}
