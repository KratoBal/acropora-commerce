import { SZURO_KULCSOK } from "../../../belso-utvonalak"

/**
 * A SZURT LAPRA MUTATO LINK NEM KOVETENDO (SEO frontend FE-4b, barracuda #524-es
 * lelete, acrobot 27606).
 *
 * A marka-szuro tobbvalasztos, tehat egy kategoria N markajabol 2^N kombinacio
 * all elo `<a href>`-kent, es mind dinamikus SSR (`_szurt`). A `noindex, follow`
 * (FE-4) a lapot nem indexelteti, de a bejaro a linkjeit tovabb koveti. Ezert
 * minden link, ami szuro-parametert visz (ugyanaz a lista, ami a `_szurt`
 * atirast kivaltja), `rel="nofollow"`-t kap. A szuro LEVETELE, ami az alaplapra
 * visz, kovetheto marad: annak nincs szuro-parametere.
 */
export function szuroLink(href: string): boolean {
  const kerdojel = href.indexOf("?")
  if (kerdojel < 0) return false
  const keres = new URLSearchParams(href.slice(kerdojel + 1).split("#")[0])
  return SZURO_KULCSOK.some((kulcs: string) => keres.has(kulcs))
}

/** A `rel` ertek a linkre: szuro-parameternel `nofollow`, kulonben semmi. */
export const szuroLinkRel = (href: string): "nofollow" | undefined =>
  szuroLink(href) ? "nofollow" : undefined
