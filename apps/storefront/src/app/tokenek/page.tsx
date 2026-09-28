import { Metadata } from "next"
import { Belleza, Hanken_Grotesk } from "next/font/google"
import { notFound } from "next/navigation"

import foundations from "../../styles/__fixtures__/figma-foundations.json"

/**
 * TOKEN-MINTALAP (P1a): a Figma "Foundations / Acropora v0.1" frame (9:2)
 * ujrarajzolasa KIZAROLAG az uj `acr` tokenekbol, hogy a ket kep
 * kepernyokeprol osszevetheto legyen.
 *
 * ELESBEN NEM ELERHETO: csak akkor renderel, ha a szerver kornyezeteben
 * `ACROPORA_TOKEN_MINTALAP=1` all; kulonben rendes 404. A dontes KERESKOR
 * tortenik (`force-dynamic`), kulonben a build-idoben hozott valasz ragadna be.
 *
 * A Hanken Grotesk es a Belleza CSAK ITT toltodik be: a tobbi oldalon a
 * token-tartalek all, tehat egyetlen meglevo oldal betukeszlete sem valtozik.
 */
export const dynamic = "force-dynamic"

export const metadata: Metadata = {
  title: "Token-mintalap",
  robots: { index: false, follow: false },
}

const hanken = Hanken_Grotesk({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500"],
  display: "swap",
  variable: "--acr-font-hanken",
})

const belleza = Belleza({
  subsets: ["latin", "latin-ext"],
  weight: "400",
  display: "swap",
  variable: "--acr-font-belleza",
})

export function mintalapEngedelyezett(
  env: Record<string, string | undefined> = process.env,
): boolean {
  return env.ACROPORA_TOKEN_MINTALAP === "1"
}

const TIPO_MINTAK: {
  stilus: string
  felirat: string
  szoveg: string
  figma: string
}[] = [
  {
    stilus: "display-hero",
    felirat: "Display/Hero",
    szoveg: "Build a reef that thrives.",
    figma: "9:80",
  },
  {
    stilus: "h1",
    felirat: "Heading/H1",
    szoveg: "Build a reef that thrives.",
    figma: "9:83",
  },
  {
    stilus: "h2",
    felirat: "Heading/H2",
    szoveg: "Build a reef that thrives.",
    figma: "9:86",
  },
  {
    stilus: "h3",
    felirat: "Heading/H3",
    szoveg: "Build a reef that thrives.",
    figma: "9:89",
  },
  {
    stilus: "body-lg",
    felirat: "Body/Large",
    szoveg: "Build a reef that thrives.",
    figma: "9:92",
  },
  {
    stilus: "body-md",
    felirat: "Body/Medium",
    szoveg: "Build a reef that thrives.",
    figma: "9:95",
  },
  {
    stilus: "body-sm",
    felirat: "Body/Small",
    szoveg: "Build a reef that thrives.",
    figma: "9:98",
  },
  {
    stilus: "eyebrow",
    felirat: "Label/Eyebrow",
    szoveg: "Build a reef that thrives.",
    figma: "9:101",
  },
  {
    stilus: "editorial-h2",
    felirat: "Editorial/H2",
    szoveg: "A reef that rewards patience.",
    figma: "9:104",
  },
  {
    stilus: "editorial-h3",
    felirat: "Editorial/H3",
    szoveg: "A reef that rewards patience.",
    figma: "9:107",
  },
]

/*
  A Tailwind csak a forrasban SZO SZERINT allo osztalyneveket generalja, ezert
  a stilus -> osztaly lekepezes itt kiirva all, nem sablonbol osszerakva.
*/
const TIPO_OSZTALY: Record<string, string> = {
  "display-hero": "font-acr-sans text-acr-display-hero",
  h1: "font-acr-sans text-acr-h1",
  h2: "font-acr-sans text-acr-h2",
  h3: "font-acr-sans text-acr-h3",
  "body-lg": "font-acr-sans text-acr-body-lg",
  "body-md": "font-acr-sans text-acr-body-md",
  "body-sm": "font-acr-sans text-acr-body-sm",
  eyebrow: "font-acr-sans text-acr-eyebrow",
  "editorial-h2": "font-acr-serif text-acr-editorial-h2",
  "editorial-h3": "font-acr-serif text-acr-editorial-h3",
}

const SZIN_OSZTALY: Record<string, string> = {
  abyss: "bg-acr-abyss",
  deep: "bg-acr-deep",
  navy: "bg-acr-navy",
  ocean: "bg-acr-ocean",
  "ocean-soft": "bg-acr-ocean-soft",
  shell: "bg-acr-shell",
  mist: "bg-acr-mist",
  line: "bg-acr-line",
  ink: "bg-acr-ink",
  slate: "bg-acr-slate",
  warm: "bg-acr-warm",
  driftwood: "bg-acr-driftwood",
  heritage: "bg-acr-heritage",
  white: "bg-acr-white",
}

const TERKOZ_OSZTALY: Record<string, string> = {
  "2xs": "w-acr-2xs",
  xs: "w-acr-xs",
  sm: "w-acr-sm",
  md: "w-acr-md",
  lg: "w-acr-lg",
  xl: "w-acr-xl",
  "2xl": "w-acr-2xl",
  "3xl": "w-acr-3xl",
  "4xl": "w-acr-4xl",
  "5xl": "w-acr-5xl",
}

const LEKEREKITES_OSZTALY: Record<string, string> = {
  none: "rounded-acr-none",
  control: "rounded-acr-control",
  card: "rounded-acr-card",
  panel: "rounded-acr-panel",
  full: "rounded-acr-full",
}

/**
 * Egy mod-kartya a mod SAJAT tokenjeibol: a `data-vilag` kapcsolo valtja a
 * `--acr-mode-*` erteket, tehat a ket kartya ugyanaz a jeloles.
 */
function ModKartya({
  vilag,
  eyebrow,
  cim,
  szoveg,
  figma,
}: {
  figma: string
  vilag: "sotet" | "vilagos"
  eyebrow: string
  cim: string
  szoveg: string
}) {
  return (
    <div
      data-figma={figma}
      data-vilag={vilag}
      className="flex h-[410px] w-[416px] flex-col justify-between border border-acr-mode-border bg-acr-mode-bg p-[28px]"
    >
      <div className="flex flex-col gap-[14px]">
        <p className="font-acr-sans text-[11px] font-medium leading-[14.333px] tracking-[1.5px] text-acr-mode-eyebrow">
          {eyebrow}
        </p>
        <p className="max-w-[340px] font-acr-sans text-[34px] font-light leading-[38px] text-acr-mode-heading">
          {cim}
        </p>
        <p className="max-w-[340px] font-acr-sans text-[15px] leading-[24px] text-acr-mode-text">
          {szoveg}
        </p>
      </div>
      <div className="self-start rounded-acr-control bg-acr-mode-action-bg px-[18px] py-[12px] font-acr-sans text-[14px] font-medium leading-[18.242px] text-acr-mode-action-text">
        Primary action
      </div>
    </div>
  )
}

export default function TokenMintalap() {
  if (!mintalapEngedelyezett()) notFound()

  return (
    <div
      className={`${hanken.variable} ${belleza.variable} w-[1440px] bg-acr-white font-acr-sans text-acr-ink`}
    >
      <div className="flex flex-col gap-[88px] px-[80px] pb-[120px] pt-[72px]">
        <section className="flex flex-col gap-[16px]">
          <p data-figma="9:4" className="text-acr-eyebrow text-acr-slate">
            FOUNDATIONS · WORKING v0.1
          </p>
          <h1 data-figma="9:5" className="text-acr-h1">
            One brand. Three contextual modes.
          </h1>
          <p
            data-figma="9:6"
            className="w-[980px] text-acr-body-lg text-acr-slate"
          >
            The mode changes with the task; the Acropora identity does not. Reef
            is emotional and immersive. Commerce is bright and precise.
            Editorial is warm, human and knowledge-led.
          </p>
        </section>

        <section className="flex flex-col gap-[24px]">
          <h2
            data-figma="9:8"
            className="text-[28px] font-medium leading-[34px] tracking-[-0.2px]"
          >
            Visual modes
          </h2>
          <div className="flex gap-[16px]">
            <ModKartya
              figma="9:10"
              vilag="sotet"
              eyebrow="OCEANIC EDITORIAL"
              cim="The reef comes first."
              szoveg="The reef is the hero. Deep, quiet, cinematic, minimal UI."
            />
            <ModKartya
              figma="9:17"
              vilag="vilagos"
              eyebrow="LIGHT OCEAN PREMIUM"
              cim="Choose with confidence."
              szoveg="Clear decisions, strong product hierarchy, bright surfaces."
            />
            {/*
              AZ EDITORIAL MOD NEM RESZE A P1a-NAK (csak Commerce es Reef).
              A kartya a primitivekbol all, hogy a kep osszevetheto maradjon;
              mod-tokenje nincs.
            */}
            <div
              data-figma="9:24"
              className="flex h-[410px] w-[416px] flex-col justify-between border border-acr-line bg-acr-warm p-[28px]"
            >
              <div className="flex flex-col gap-[14px]">
                <p className="text-[11px] font-medium leading-[14.333px] tracking-[1.5px] text-acr-slate">
                  SOFT MARINE
                </p>
                <p className="max-w-[340px] text-[34px] font-light leading-[38px] text-acr-ink">
                  Understand before you change.
                </p>
                <p className="max-w-[340px] text-[15px] leading-[24px] text-acr-slate">
                  Warm knowledge, people, service and long-term reef success.
                </p>
              </div>
              <div className="self-start rounded-acr-control bg-acr-navy px-[18px] py-[12px] text-[14px] font-medium leading-[18.242px] text-acr-white">
                Primary action
              </div>
            </div>
          </div>
        </section>

        <section className="flex flex-col gap-[20px]">
          <h2
            data-figma="9:32"
            className="text-[28px] font-medium leading-[34px] tracking-[-0.2px]"
          >
            Color primitives
          </h2>
          <div className="flex flex-wrap gap-x-[14px] gap-y-[20px]">
            {Object.keys(foundations.colors).map((nev, i) => (
              <div
                key={nev}
                className="flex h-[140px] w-[118px] flex-col gap-[8px]"
              >
                <div
                  data-figma={`9:${35 + 3 * i}`}
                  className={`h-[96px] w-[118px] rounded-acr-card ${SZIN_OSZTALY[nev]}`}
                />
                <p className="text-[12px] leading-[15.636px] text-acr-slate">
                  {nev}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="flex flex-col">
          <h2
            data-figma="9:77"
            className="text-[28px] font-medium leading-[34px] tracking-[-0.2px]"
          >
            Typography
          </h2>
          {TIPO_MINTAK.map((minta) => (
            <div
              key={minta.stilus}
              className="flex flex-col gap-[6px] border-b border-acr-line py-[22px]"
            >
              {/*
                14px, NEM 14.333: a Figma a 11 px-es cimke dobozat 14-re kerekiti
                (9:79, h=14), es a sorok magassaga ebbol all ossze. A tort ertek
                soronkent 0.33 px-szel tolta el a lap aljat (merve: 3.3 px).
              */}
              <p className="text-[11px] font-medium leading-[14px] text-acr-slate">
                {minta.felirat}
              </p>
              <p
                data-figma={minta.figma}
                className={TIPO_OSZTALY[minta.stilus]}
              >
                {minta.szoveg}
              </p>
            </div>
          ))}
        </section>

        <section className="flex gap-[64px]">
          <div className="flex w-[608px] flex-col gap-[12px]">
            <h2
              data-figma="9:110"
              className="text-[28px] font-medium leading-[34px] tracking-[-0.2px]"
            >
              Spacing
            </h2>
            {Object.entries(foundations.spacing).map(([nev, px], i) => (
              <div key={nev} className="flex h-[16px] items-center gap-[12px]">
                <div
                  data-figma={`9:${112 + 3 * i}`}
                  className={`h-[10px] rounded-acr-control bg-acr-ocean ${TERKOZ_OSZTALY[nev]}`}
                />
                <p className="text-[12px] leading-[15.636px] text-acr-slate">
                  spacing/{nev} · {px}px
                </p>
              </div>
            ))}
          </div>
          <div className="flex w-[608px] flex-col gap-[18px]">
            <h2
              data-figma="9:142"
              className="text-[28px] font-medium leading-[34px] tracking-[-0.2px]"
            >
              Radius
            </h2>
            <div className="flex gap-[18px]">
              {Object.keys(foundations.radius).map((nev, i) => (
                <div key={nev} className="flex flex-col items-center gap-[8px]">
                  <div
                    data-figma={`9:${145 + 3 * i}`}
                    className={`h-[72px] w-[72px] bg-acr-ocean-soft ${LEKEREKITES_OSZTALY[nev]}`}
                  />
                  <p className="text-[11px] leading-[14.333px] text-acr-slate">
                    {nev}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section
          data-figma="9:159"
          className="flex flex-col gap-[18px] bg-acr-warm p-[36px]"
        >
          <h2 className="font-acr-serif text-[42px] font-light leading-[48px] tracking-[-0.2px]">
            Design north star
          </h2>
          {[
            "Premium without being pretentious.",
            "Expert without intimidating beginners.",
            "Marine without aquarium-shop clichés.",
            "The reef is the hero. The interface supports it.",
            "If everything is emphasized, nothing is premium.",
          ].map((sor) => (
            <p key={sor} className="text-[17px] leading-[28px]">
              {sor}
            </p>
          ))}
        </section>
      </div>

      {/*
        A FRAME ALATT, KULON: a ket token, ami a Foundations frame-en nem
        szerepel, csak stiluskent letezik (4:55 Wordmark, 4:56 Shadow/Subtle).
        A kepernyokep-osszevetes a frame magassagaig (3396 px) megy.
      */}
      <div className="flex items-center gap-[48px] bg-acr-shell px-[80px] py-[48px]">
        <p className="font-acr-wordmark text-acr-wordmark">ACROPORA</p>
        <div className="h-[72px] w-[160px] rounded-acr-card bg-acr-white shadow-acr-subtle" />
      </div>
    </div>
  )
}
