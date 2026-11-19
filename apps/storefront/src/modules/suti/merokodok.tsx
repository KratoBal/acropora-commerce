"use client"

import { usePathname } from "next/navigation"
import { useEffect, useRef, useState } from "react"

import {
  gtagScriptCim,
  lathatoUtvonal,
  merheto,
  META_SCRIPT_CIM,
  mitToltsunk,
  sutiDomainek,
  torlendoSutik,
  vanMerokod,
  type MerokodAzonositok,
} from "@lib/util/merokodok"
import {
  consentJelek,
  olvasDontes,
  SUTI_DONTES_ESEMENY,
  type SutiDontes,
} from "@lib/util/suti-hozzajarulas"

type Fuggveny = (...argumentumok: unknown[]) => void
type Ablak = Window & {
  gtag?: Fuggveny
  fbq?: Fuggveny & {
    callMethod?: Fuggveny
    queue?: unknown[][]
    push?: unknown
    loaded?: boolean
    version?: string
  }
  _fbq?: unknown
}

const GTAG_SCRIPT_ID = "acropora-gtag"
const META_SCRIPT_ID = "acropora-fbevents"

/** Egy kulso scriptet egyszer, azonositoval illeszt a lapba. */
function scriptBetoltese(azonosito: string, cim: string): void {
  if (document.getElementById(azonosito)) return
  const elem = document.createElement("script")
  elem.id = azonosito
  elem.async = true
  elem.src = cim
  document.head.appendChild(elem)
}

/** A Meta-pixel szabvanyos betoltoje, beagyazott szkript nelkul: a `fbq` varakozosor, majd a script. */
function fbqAlap(ablak: Ablak): void {
  if (ablak.fbq) return
  const n = ((...argumentumok: unknown[]) => {
    if (n.callMethod) n.callMethod(...argumentumok)
    else n.queue!.push(argumentumok)
  }) as NonNullable<Ablak["fbq"]>
  n.push = n
  n.loaded = true
  n.version = "2.0"
  n.queue = []
  ablak.fbq = n
  if (!ablak._fbq) ablak._fbq = n
}

/** A kategoria sutijeinek torlese minden szoba johato domainen. */
function sutikTorlese(kategoria: "statisztika" | "marketing"): void {
  for (const nev of torlendoSutik(document.cookie, kategoria))
    for (const domain of sutiDomainek(window.location.hostname))
      document.cookie =
        `${nev}=; Path=/; Max-Age=0` + (domain ? `; Domain=${domain}` : "")
}

/**
 * A MEROKODOK (GA4, GOOGLE ADS, META PIXEL) A HOZZAJARULAS MOGOTT (kartya dc8cabd2). A tiszta szabalyok a
 * `lib/util/merokodok.ts`-ben vannak; ez csak vegrehajt.
 *
 * - AMIG NINCS ERVENYES DONTES VAGY NINCS BEKOTOTT AZONOSITO: SEMMI (nincs script, nincs hivas, nincs suti).
 * - Statisztika megadva: GA4 (`gtag.js`). Marketing megadva: Google Ads es Meta pixel.
 * - Visszavonas: a Consent Mode `denied`-ot a suti-ablak kuldi; ez torli a kategoria sutijeit (a visszavonas a mar
 *   elhelyezettekre is hat), a pixelnek `consent revoke`-ot kuld, es a mero script tobbet NEM kap esemenyt. A betoltott scriptet
 *   az oldal nem tudja kiszedni: a kovetkezo betoltesnel mar nem toltodik.
 * - Esemeny csak az oldalmegtekintes (acrobot: a kereskedelmi esemenyek kulon szelet). A rendeles es a fiok lapjarol nincs
 *   esemeny, es a `page_location` ott altalanos utvonal (token az URL-ben).
 */
export default function Merokodok(props: {
  ga4: string | null
  ads: string | null
  meta: string | null
}) {
  const { ga4, ads, meta } = props
  const pathname = usePathname() ?? ""
  const [dontes, setDontes] = useState<SutiDontes | null>(null)
  const allapot = useRef({
    ga4: false,
    ads: false,
    meta: false,
    gtagJs: false,
    metaInit: false,
    // az utolso lap, amelyiknek az oldalmegtekintese az adott eszkoznek mar kiment (eszkozonkent: egy ujonnan megadott
    // kategoria a mar latott lapot is megkapja, a mar kapott eszkoz nem kap duplat)
    utolso: { ga4: "", ads: "", meta: "" },
  })

  useEffect(() => {
    if (!vanMerokod({ ga4, ads, meta })) return
    setDontes(olvasDontes(document.cookie))
    // A DONTES VALTOZASA (megadas VAGY visszavonas): az uj dontes beolvasva, es amit a vevo MOST utasitott el, annak a sutijei
    // torlodnek akkor is, ha ezen a lapon a merokod nem toltodott be (a suti egy korabbi laprol maradt): a visszavonas nem csak
    // a jovore hat.
    const valtozas = () => {
      const uj = olvasDontes(document.cookie)
      setDontes(uj)
      if (!uj) return
      if (!uj.statisztika) sutikTorlese("statisztika")
      if (!uj.marketing) {
        ;(window as Ablak).fbq?.("consent", "revoke")
        sutikTorlese("marketing")
      }
    }
    window.addEventListener(SUTI_DONTES_ESEMENY, valtozas)
    return () => window.removeEventListener(SUTI_DONTES_ESEMENY, valtozas)
  }, [ga4, ads, meta])

  useEffect(() => {
    const azon: MerokodAzonositok = { ga4, ads, meta }
    if (!vanMerokod(azon)) return
    const ablak = window as Ablak
    const mit = mitToltsunk(dontes, azon)
    const a = allapot.current

    // --- visszavonas: a betoltott eszkoz tobbet nem kap esemenyt (a sutik torlese a valtozas-figyelon ment)
    if (a.ga4 && !mit.ga4) {
      a.ga4 = false
      a.utolso.ga4 = ""
    }
    if (a.ads && !mit.ads) {
      a.ads = false
      a.utolso.ads = ""
    }
    if (a.meta && !mit.meta) {
      a.meta = false
      a.utolso.meta = ""
    }

    // --- Google (GA4 es Ads: egyetlen gtag.js)
    const gtagCim = gtagScriptCim(mit)
    if (gtagCim && ablak.gtag) {
      if (!a.gtagJs) {
        scriptBetoltese(GTAG_SCRIPT_ID, gtagCim)
        ablak.gtag("js", new Date())
        a.gtagJs = true
      }
      // a kategoria jelei frissitve (a suti-ablak is kuldi; ez a tarolt dontessel indulo lapot is lefedi)
      if (dontes) ablak.gtag("consent", "update", consentJelek(dontes))
      for (const [kulcs, azonosito] of [
        ["ga4", mit.ga4],
        ["ads", mit.ads],
      ] as const) {
        if (azonosito && !a[kulcs]) {
          ablak.gtag("config", azonosito, { send_page_view: false })
          a[kulcs] = true
        }
      }
    }

    // --- Meta pixel
    if (mit.meta && !a.meta) {
      fbqAlap(ablak)
      scriptBetoltese(META_SCRIPT_ID, META_SCRIPT_CIM)
      // az automatikus esemenyek (kattintas, oldal-metaadat) az URL-t olvasnak: kikapcsolva, csak a sajat esemenyeink mennek
      // visszavonas utan ujra megadva: a pixel consent-je ujra enged (elso betolteskor ez nem hat)
      ablak.fbq?.("consent", "grant")
      if (!a.metaInit) {
        ablak.fbq?.("set", "autoConfig", false, mit.meta)
        ablak.fbq?.("init", mit.meta)
        a.metaInit = true
      }
      a.meta = true
    }

    // --- oldalmegtekintes (egyszer lapvaltasonkent), csak ahol van mit mondani
    if (a.ga4 || a.ads || a.meta) {
      const latszo = lathatoUtvonal(pathname)
      if (ablak.gtag && (a.ga4 || a.ads)) {
        // a mero script automatikus esemenyei is ezt az utat latjak, nem az igazi cimet
        ablak.gtag("set", {
          page_location: window.location.origin + latszo,
          page_path: latszo,
        })
      }
      if (merheto(pathname)) {
        const cel: string[] = []
        if (a.ga4 && mit.ga4 && a.utolso.ga4 !== pathname) {
          cel.push(mit.ga4)
          a.utolso.ga4 = pathname
        }
        if (a.ads && mit.ads && a.utolso.ads !== pathname) {
          cel.push(mit.ads)
          a.utolso.ads = pathname
        }
        if (cel.length && ablak.gtag)
          ablak.gtag("event", "page_view", {
            send_to: cel,
            page_location: window.location.origin + latszo,
            page_path: latszo,
            page_title: document.title,
          })
        if (a.meta && a.utolso.meta !== pathname) {
          a.utolso.meta = pathname
          ablak.fbq?.("track", "PageView")
        }
      }
    }
  }, [dontes, pathname, ga4, ads, meta])

  return null
}
