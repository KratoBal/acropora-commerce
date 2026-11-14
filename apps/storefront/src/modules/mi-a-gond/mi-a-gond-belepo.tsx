import {
  MIAGOND_BEVEZETO,
  MIAGOND_CIM,
  MIAGOND_FIGYELMEZTETES,
  type TunetOldal,
} from "@lib/util/mi-a-gond"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A "MI A GOND A MEDENCEDDEL?" BELEPO (V4.3, kartya 85545d1f): a tunetek listaja Korall szamozasaval, a szam a tunet-oldalakon
 * az "N. oldal" hivatkozasok celja. FEJLECREND: h1 a cim (az oldalak h2-vel folytatodnak, a lista nem fejlec).
 */
export default function MiAGondBelepo({
  oldalak,
}: {
  oldalak: readonly TunetOldal[]
}) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-8"
        data-testid="mi-a-gond"
      >
        <header className="flex flex-col gap-3">
          <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
            {MIAGOND_CIM}
          </h1>
          <p className="text-[15px] text-acr-slate">{MIAGOND_BEVEZETO}</p>
        </header>
        <ul className="flex flex-col gap-3" data-testid="mi-a-gond-lista">
          {oldalak.map((oldal) => (
            <li
              key={oldal.slug}
              className="border border-acr-line bg-acr-white px-5 py-4"
            >
              <LocalizedClientLink
                href={`/mi-a-gond/${oldal.slug}`}
                className="text-[17px] text-acr-ink underline"
                data-testid="mi-a-gond-tunet"
              >
                {oldal.szam}. {oldal.cim}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
        <p className="text-[13px] text-acr-slate">{MIAGOND_FIGYELMEZTETES}</p>
      </div>
    </div>
  )
}
