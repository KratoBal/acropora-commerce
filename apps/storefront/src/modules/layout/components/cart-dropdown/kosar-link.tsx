import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A KOSAR-HIVATKOZAS A FEJLECBEN -- EGY HELYEN, KET HIVOVAL.
 *
 * === MIERT KOZOS ===
 *
 * Ugyanez a gomb KET helyen allt betuere azonos alakban: a `CartDropdown`-ban
 * a valodi darabszammal, es a `nav/index.tsx` `Suspense` tartalekaban nullaval.
 * Ket masolat ugyanarra elobb-utobb elcsuszik, es itt a csuszas RITKAN
 * latszana: a tartalek csak a betoltes elso pillanataiban all a lapon.
 *
 * === A MOBIL ALAK: CSUPASZ SZAM ===
 *
 * A tervlap mobil kerete (390 pixel) NEM a "Kosár · N" rovidebb valtozatat
 * mutatja, hanem CSAK A SZAMOT -- a "Kosár" szo teljesen eltunik. Asztalin
 * viszont ott all. (picasso leirasa a terv mobil szakaszarol, 2026-09-09;
 * forras: `Termekoldal Technika.dc.html`.)
 *
 * === A TORESPONT NEM TALALGATAS ===
 *
 * A `lg` (1024 pixel) az, ahol MAGA A TERMEKLAP egy oszlopbol kettobe valt
 * (`lap-vaz/index.tsx`: `lg:grid-cols-[minmax(0,1fr)_452px]`, mellette
 * `max-lg:flex-col`). Ugyanaz a hatar tehat, amit a lap mar hasznal, nem egy
 * masodik "mobil" fogalom. Merve a kirakatban: `lg:` 56 helyen all, a tobbi
 * alapertelmezett toresponthoz kepest ez a bevett.
 *
 * A "Kosár" szo `aria-hidden`, es a hivatkozas `aria-label`-t kap: a
 * FELOLVASO igy MINDKET meretben teljes mondatot hall, a szem viszont
 * mobilon csak a szamot latja. Enelkul a mobil alak egy magaban allo szam
 * lenne, aminek semmi nem mondja meg a jelenteset.
 */
export const kosarFelirat = (darab: number) => `Kosár · ${darab}`

export const KosarLink = ({ darab }: { darab: number }) => (
  <LocalizedClientLink
    className="flex h-[46px] items-center px-5 text-[14px] font-semibold"
    style={{
      background: "var(--terv-szoveg)",
      color: "var(--terv-hatter)",
    }}
    href="/cart"
    aria-label={kosarFelirat(darab)}
    data-testid="nav-cart-link"
  >
    <span aria-hidden="true" className="hidden lg:inline">
      Kosár&nbsp;·&nbsp;
    </span>
    <span aria-hidden="true">{darab}</span>
  </LocalizedClientLink>
)
