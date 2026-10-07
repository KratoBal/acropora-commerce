import { Metadata } from "next"
import { notFound } from "next/navigation"

import { HAMAROSAN_TEMAK } from "@lib/util/fejlec-menu-pontok"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A "HAMAROSAN" LAP (2026-09-29, acrobot dontese).
 *
 * A Figma fejlec (215:41) olyan menupontokat is mutat, amiknek meg nincs
 * celoldaluk (Tudástár, Szolgáltatások, Akváriumaim, ma a Technika is), es a
 * kereso sav szakerto-gombjat. Ezek ide mutatnak, nem halott linkre es nem egy
 * rokon lapra, ami mast igerne.
 *
 * Csak a `HAMAROSAN_TEMAK` temai leteznek; minden mas valodi 404. A lap nem
 * kerul a keresok indexebe: nincs tartalma, csak egy igerete.
 */
type Props = { params: Promise<{ countryCode: string; tema: string }> }

/*
 * ISR (FE-7, Balazs 2026-10-07): a lap igeny szerint keszul es gyorsitotarba
 * kerul. A `generateStaticParams` nelkul a Next 15 a dinamikus szegmenst
 * (`[countryCode]`) minden keresre ujra renderelne, `private, no-store`
 * valasszal, akkor is, ha a lap semmi dinamikusat nem olvas (merve
 * 2026-10-07 egy 15.5.24-es probaepitesen). Az ures lista: nincs elore
 * epites, az elso keres epit. A `revalidate` a tartalek, ha egy urites elmarad.
 */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const { tema } = await props.params
  const cim = HAMAROSAN_TEMAK.get(tema)
  return {
    title: cim ? `${cim} · Hamarosan` : "404",
    robots: { index: false, follow: true },
  }
}

export default async function HamarosanLap(props: Props) {
  const { tema } = await props.params
  const cim = HAMAROSAN_TEMAK.get(tema)
  if (!cim) notFound()

  return (
    <section
      className="flex min-h-[50vh] flex-col items-center justify-center gap-4 px-[18px] py-16 text-center font-acr-sans"
      data-testid="hamarosan-lap"
    >
      <p className="text-[12.5px] font-semibold uppercase tracking-[1.5px] text-acr-heritage">
        Hamarosan
      </p>
      <h1 className="text-[28px] font-bold leading-[34px] text-acr-mode-heading">
        {cim}
      </h1>
      <p className="max-w-[480px] text-[15px] text-acr-mode-text">
        Ez az oldal még készül.
      </p>
      <LocalizedClientLink
        href="/"
        className="text-[13px] font-semibold text-acr-mode-heading underline underline-offset-4"
      >
        Vissza a főoldalra
      </LocalizedClientLink>
    </section>
  )
}
