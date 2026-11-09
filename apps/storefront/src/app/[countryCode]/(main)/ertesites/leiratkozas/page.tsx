import { Metadata } from "next"

import { translator } from "@lib/i18n/dictionary"
import { localeOf } from "@lib/i18n/locale"
import HirlevelLinkUrlap from "@modules/hirlevel/components/hirlevel-link-urlap"

type Props = { params: Promise<{ countryCode: string }> }

/**
 * A "SZÓLJ, HA JÖN HASONLÓ" ERTESITES LEVELEBEN KULDOTT LINK LAPJA (V2.4, 0c1265d2), a hirlevel lapjanak mintajara
 * (`hirlevel/megerosites`). A lap statikus keret: a token
 * a cimbol a bongeszoben olvasodik, es csak a gomb megnyomasara megy a bolthoz (`HirlevelLinkUrlap`), tehat
 * a lap gyorsitotarazhato, es egy levelszkenner, ami megnyitja a linket, nem dont semmirol. Keresobe nem kerul,
 * es a tokenes cim nem megy tovabb hivatkozokent.
 */
export async function generateMetadata(props: Props): Promise<Metadata> {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return {
    title: t("stockAlertLink.leaveTitle"),
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  }
}

export const revalidate = 300

// statikus keret (a token a bongeszoben olvasodik): ISR, mint a tobbi publikus lap
export async function generateStaticParams() {
  return []
}

export default async function ErtesitesLeiratkozasPage(props: Props) {
  const { countryCode } = await props.params
  const t = translator(localeOf(countryCode))
  return (
    <div
      className="content-container flex justify-center py-10 small:py-16"
      data-testid="ertesites-leiratkozas"
    >
      <div className="flex w-full max-w-[640px] flex-col gap-y-6">
        <header className="flex flex-col gap-y-2">
          <h1 className="text-[26px] font-semibold text-acr-ink">
            {t("stockAlertLink.leaveTitle")}
          </h1>
          <p className="text-acr-slate">{t("stockAlertLink.leaveIntro")}</p>
        </header>
        <HirlevelLinkUrlap fajta="leiratkozas" tema="ertesites" />
      </div>
    </div>
  )
}
