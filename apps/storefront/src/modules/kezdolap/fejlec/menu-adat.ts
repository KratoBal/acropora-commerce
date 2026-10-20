import { kulcs } from "@lib/util/fejlec-menu-pontok"
import type { Szovegek } from "@modules/kezdolap/szovegek"

/**
 * A DESIGN LENYILO MENUJENEK ADATA A VALODI MEDUSA KATEGORIAKBOL (Balazs,
 * 2026-10-20: "a menu az legyen amit a design csinalt", a tartalom a mi
 * adatunk). A terv oszlopai es linkjei NEM innen jonnek, hanem a bolt
 * kategoria-fajabol; ahol a tervnek van olyan pontja, amihez nincs valodi
 * kategoria, az kimarad: nem talalunk ki menupontot.
 *
 * === A SZABALY ===
 *
 * Egy menupont a szerkeszthetoen megadott gyoker-handle-okbol (`fejlec.N.
 * kategoriak`) kapja az oszlopait:
 *
 *   - ha EGYETLEN gyoker van megadva (es talalt), es annak a gyerekeinek
 *     vannak sajat gyerekeik (Technika > Vilagitas > LED-lampak), akkor az
 *     oszlopok a gyerekek, a linkjeik az unokak;
 *   - kulonben (tobb gyoker, vagy lapos fa: Elollat = Halak, Korallok,
 *     Gerinctelenek) az oszlopok maguk a gyokerek, a linkjeik a gyerekeik.
 *
 * A handle-t ekezet- es kisbetu-fuggetlenul keresi (`kulcs`), mint a regi
 * fejlec, es amit nem talal (nincs ilyen gyoker, vagy ures a boltban), azt
 * kihagyja. Az oszlopok szama 8, az oszlop linkjeie 8-ra korlatozottak, a
 * kiirt nev a `nevek` terkep szerint (a szulo-elotag nelkul).
 */
export type MenuKategoria = {
  id: string
  name: string
  handle?: string | null
  category_children?: readonly MenuKategoria[] | null
}

export type MenuLink = { nev: string; href: string }
export type MenuOszlop = { cim: string; href: string; linkek: MenuLink[] }
export type MenuKartya = {
  cim: string
  szoveg: string
  felirat: string
  href: string | null
  /** A kartya szovege kitalalt allitas, amig az OS nem irt sajatot. */
  minta: boolean
}
export type MenuPont = {
  felirat: string
  /** A menupont sajat cime, ha NINCS lenyiloja (vagy a fejlec-felirat linkje). */
  href: string | null
  oszlopok: MenuOszlop[]
  kartya: MenuKartya | null
}

export const MAX_OSZLOP = 8
export const MAX_OSZLOP_LINK = 8
export const MAX_GYOKER = 6

/** A szerkesztheto handle-lista: vesszo vagy szokoz valasztja el, csak biztonsagos alak. */
export function handleLista(szoveg: string): string[] {
  return szoveg
    .split(/[\s,]+/)
    .filter((h) => /^[A-Za-z0-9._-]{1,200}$/.test(h) && !h.includes(".."))
    .slice(0, MAX_GYOKER)
}

const utja = (k: MenuKategoria) =>
  `/categories/${encodeURIComponent(k.handle ?? "")}`

const nevenek = (k: MenuKategoria, nevek: ReadonlyMap<string, string>) =>
  nevek.get(k.id) ?? k.name

const hasznalhato = (k: MenuKategoria) => Boolean(k.handle)

export function menuOszlopok(
  gyokerek: readonly MenuKategoria[],
  nevek: ReadonlyMap<string, string>,
  handlek: readonly string[],
): MenuOszlop[] {
  const forrasok = handlek.flatMap((h) => {
    const gyoker = gyokerek.find((g) => kulcs(g.handle) === kulcs(h))
    return gyoker && hasznalhato(gyoker) ? [gyoker] : []
  })
  if (!forrasok.length) return []

  const oszlop = (k: MenuKategoria): MenuOszlop => ({
    cim: nevenek(k, nevek),
    href: utja(k),
    linkek: (k.category_children ?? [])
      .filter(hasznalhato)
      .slice(0, MAX_OSZLOP_LINK)
      .map((g) => ({ nev: nevenek(g, nevek), href: utja(g) })),
  })

  const egyetlen = forrasok.length === 1 ? forrasok[0] : undefined
  const gyerekek = (egyetlen?.category_children ?? []).filter(hasznalhato)
  const melyFa = gyerekek.some((g) =>
    (g.category_children ?? []).some(hasznalhato),
  )
  const oszlopok =
    egyetlen && melyFa ? gyerekek.map(oszlop) : forrasok.map(oszlop)
  return oszlopok.slice(0, MAX_OSZLOP)
}

export const MENUPONTOK = [1, 2, 3, 4, 5]

/**
 * A MENUPONTOK A SZERKESZTHETO SZOVEGEKBOL ES A KATEGORIAFABOL.
 *
 * Egy pont megjelenik, ha van felirata ES (van lenyiloja, vagy van cime): egy
 * felirat, ami nem visz sehova es nem nyilik, rosszabb a hianyzonal. A kartya
 * akkor all, ha van cime vagy szovege; a hivatkozasa csak felirattal es celral.
 */
export function menuPontok(
  s: Szovegek,
  gyokerek: readonly MenuKategoria[],
  nevek: ReadonlyMap<string, string>,
): MenuPont[] {
  return MENUPONTOK.flatMap((n) => {
    const felirat = s.szoveg(`fejlec.${n}.felirat`)
    if (!felirat) return []
    const oszlopok = menuOszlopok(
      gyokerek,
      nevek,
      handleLista(s.szoveg(`fejlec.${n}.kategoriak`)),
    )
    const cim = s.link(`fejlec.${n}.link`)
    if (!oszlopok.length && !cim) return []
    const kcim = s.szoveg(`fejlec.${n}.kartya.cim`)
    const kszoveg = s.szoveg(`fejlec.${n}.kartya.szoveg`)
    const kfelirat = s.szoveg(`fejlec.${n}.kartya.felirat`)
    const khref = s.link(`fejlec.${n}.kartya.link`)
    const kartya: MenuKartya | null =
      oszlopok.length && (kcim || kszoveg)
        ? {
            cim: kcim,
            szoveg: kszoveg,
            felirat: khref && kfelirat ? kfelirat : "",
            href: khref && kfelirat ? khref.href : null,
            minta: s.minta(`fejlec.${n}.kartya.szoveg`),
          }
        : null
    return [{ felirat, href: cim ? cim.href : null, oszlopok, kartya }]
  })
}
