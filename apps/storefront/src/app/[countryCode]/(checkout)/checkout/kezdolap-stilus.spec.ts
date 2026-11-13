import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A PENZTAR A KEZDOLAP STILUSAT KAPJA (Balazs 2026-11-02 "mindegyik mehet": kosar, penztar, kategoria; a kategoria #748, a
 * kosar #752): a sav oldalszele a 64 pixeles kezdolapi szel (a fejlec es a lablec is ennyi; a penztar 56 volt), a fo cimek a
 * kezdolap szerif betujevel, normal vastagsaggal, es a penztar sajat felso savja ugyanazt a szelet viszi (24 helyett).
 * A mobil oldalszel (16) valtozatlan.
 *
 * MI PIROSIT: ha a penztar vagy a fizetesi oldal sav oldalszele a regi 56 marad; ha a penztar cime vagy a fizetesi oldal
 * cime a talpatlan marad; ha a felso sav a `content-container` 24 pixeles szelet viseli.
 *
 * MIERT A FORRASBOL: az oldal es a kiosztas szerver-komponens (a kosar sablonjahoz hasonloan, jsdom-ban nem renderelheto); a
 * fizetesi oldal cimet es az oldalsav cimet renderelt teszt is nezi.
 */
const SRC = join(process.cwd(), "src")
const olvas = (ut: string) => readFileSync(join(SRC, ut), "utf-8")
const kornyeken = (forras: string, jel: string) => {
  const i = forras.indexOf(jel)
  expect(i, `${jel} hiányzik`).toBeGreaterThan(-1)
  return forras.slice(Math.max(0, i - 200), i + 200)
}

describe("a pénztár a kezdőlap stílusában", () => {
  const oldal = olvas("app/[countryCode]/(checkout)/checkout/page.tsx")
  const kiosztas = olvas("app/[countryCode]/(checkout)/layout.tsx")
  const fizetes = olvas("modules/checkout/templates/fizetesi-oldal/index.tsx")

  it("a sávok oldalszele a 64 pixeles kezdőlapi szél, a mobil 16 marad", () => {
    for (const forras of [oldal, fizetes]) {
      const sav = kornyeken(forras, "max-w-[1440px]")
      expect(sav).toContain("small:px-16")
      expect(sav).toContain("px-4")
      expect(sav).not.toContain("small:px-[56px]")
    }
  })

  it("a pénztár címe a kezdőlap betűjével, normál vastagsággal", () => {
    const cim = kornyeken(oldal, 'checkoutPage.title")}')
    expect(cim).toContain("font-kiemelt")
    expect(cim).toContain("font-normal")
    expect(cim).toContain("tracking-[-0.01em]")
    expect(cim).not.toContain("font-light")
  })

  it("a felső sáv ugyanazt az oldalszélet viszi, nem a 24 pixeles content-containert", () => {
    const sav = kornyeken(kiosztas, "<nav")
    expect(sav).toContain("small:px-16")
    expect(sav).not.toContain("content-container")
  })

  /**
   * A PENZTAR SZUKITETT FEJLECE A VALODI LOGOVAL, ES A KOZOS LABLEC (acrobot 49644, Balazs 2026-10-26: fejlec es lablec minden
   * aloldalon a kezdolap szerint). MI PIROSIT: ha a felso sav megint csak az "ACROPORA" szoveget viszi; ha a lablec kimarad; ha
   * a tartalom `min-h-screen`-nel kitolja a kepernyot a lablec elott.
   */
  it("a felső sáv a valódi logót viszi, és a lábléc ott áll", () => {
    expect(kiosztas).toContain('src="/images/acropora-logo.svg"')
    expect(kiosztas).toContain('data-testid="penztar-logo"')
    expect(kiosztas).not.toMatch(/uppercase tracking-\[1\.8px\]/)
    expect(kiosztas).toContain(
      'import Footer from "@modules/layout/templates/footer"',
    )
    expect(kiosztas).toContain("<Footer countryCode={countryCode} />")
    expect(kiosztas).not.toContain("min-h-screen")
  })

  /**
   * A RAGADO FIZETESI SAV NEM FEDHETI A LABLEC ALJAT (barracuda, #754): mobilon a `stripe-cta-sav` (fixed bottom-0, ~76 px)
   * a dokumentum aljara esne, ahol most a lablec van. A kiosztas a lablec UTAN helyfoglalot ad, amely csak a sav jelenlete
   * mellett foglal helyet. MI PIROSIT: ha a helyfoglalo kimarad; ha a lablec ELE kerul; ha a stilus nem a sav jelenletehez
   * kotott; ha a sav jelzoje (`stripe-cta-sav`) megvaltozik, es a helyfoglalo nem veszi eszre.
   */
  it("a lábléc után mobil helyfoglaló áll, amely csak a fizetési sáv mellett foglal helyet", () => {
    const lablec = kiosztas.indexOf("<Footer countryCode={countryCode} />")
    const hely = kiosztas.indexOf("penztar-lablec-hely")
    expect(lablec).toBeGreaterThan(-1)
    expect(hely, "helyfoglaló hiányzik").toBeGreaterThan(-1)
    expect(hely).toBeGreaterThan(lablec)
    expect(kornyeken(kiosztas, 'className="penztar-lablec-hely')).toContain(
      "small:hidden",
    )
    expect(kornyeken(kiosztas, 'className="penztar-lablec-hely')).toContain(
      'aria-hidden="true"',
    )

    const stilus = olvas("styles/globals.css")
    expect(stilus).toContain(
      'body:has([data-testid="stripe-cta-sav"]) .penztar-lablec-hely',
    )
    expect(kornyeken(stilus, ".penztar-lablec-hely {")).toContain("height: 0")
    // a sav jelzoje valoban a fizetesi lepesben all
    expect(olvas("modules/checkout/components/payment/index.tsx")).toContain(
      'data-testid="stripe-cta-sav"',
    )
  })
})
