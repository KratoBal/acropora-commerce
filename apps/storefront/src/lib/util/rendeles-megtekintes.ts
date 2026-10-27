import { createHmac } from "node:crypto"

/**
 * A VISSZAIGAZOLO LAP RESZLETEI CSAK ANNAK JARNAK, AKI LEADTA A RENDELEST
 * (audit P1/5, 05-adatkezeles.md A6). A `/order/:id/confirmed` lap eddig
 * bejelentkezes nelkul, a rendelesazonosito birtokaban megmutatta a nevet, a
 * cimet, a telefonszamot es az e-mail-cimet: aki az URL-t megszerzi
 * (bongeszo-elozmeny, megosztott gep), latja a szemelyes adatokat.
 *
 * A leadas utan a kirakat egy ALAIRT, rovid eletu sutit ad a bongeszonek,
 * ami a most leadott rendelesek azonositoit nevezi meg. A LAP a reszleteket
 * csak ennek, vagy a bejelentkezett tulajdonosnak mutatja; az azonosito
 * maga ezutan a lapon nem eleg. A suti alairasa kell, mert alairas nelkul a
 * suti az azonositobol barkinek elo allithato lenne, es ugyanott tartanank.
 *
 * A HATTER UGYANEZT ELLENORZI (audit A6b): a Medusa gyari
 * `GET /store/orders/:id` vegpontja hitelesites nelkul kiadta a rendelest a
 * nyilvanos publikalhato kulccsal. Most a hatter csak a rendeles tulajdonosanak,
 * vagy ennek a sutinek az ertekevel adja ki (a kirakat szervere a
 * `x-acropora-order-view` fejlecben tovabbitja), kulonben 404. Az ellenorzes
 * a hatter `order-read-guard.ts` fajljaban all, es egy szerzodes-teszt
 * rogziti, hogy a kettő ugyanazt fogadja el.
 *
 * Titok nelkul (nincs beallitva) nincs alairas, tehat nincs suti sem: a lap
 * a minimalis alakot mutatja (rendelesszam es koszonet), nem a reszleteket.
 * A hianyzo titok a vevo szamara csak annyit jelent, hogy a reszleteket a
 * visszaigazolo levelben es a fiokjaban talalja.
 */
export const MEGTEKINTES_SUTI = "_acropora_order_view"

/** A fejlec, amiben a kirakat szervere a sutit a hatternek tovabbitja (audit A6b). */
export const RENDELES_MEGTEKINTES_FEJLEC = "x-acropora-order-view"
export const MEGTEKINTES_ELETTARTAM_MP = 60 * 60

const TITOK_NEV = "domain:acropora-order-view:v1"

const titok = (): string | null =>
  process.env.ORDER_VIEW_SECRET?.trim() ||
  process.env.STOREFRONT_REVALIDATE_SECRET?.trim() ||
  null

const alairas = (kulcs: string, szoveg: string) =>
  createHmac(
    "sha256",
    createHmac("sha256", kulcs).update(TITOK_NEV).digest("hex"),
  )
    .update(szoveg)
    .digest("hex")

/** Allando ideju osszevetes (a hossz kulon: a hex alairasok hossza ugyanaz). */
const egyezik = (a: string, b: string) => {
  if (a.length !== b.length) return false
  let kulonbseg = 0
  for (let i = 0; i < a.length; i++)
    kulonbseg |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return kulonbseg === 0
}

/** `<lejarat mp>.<azonositok vesszovel>.<alairas>`, vagy `null` titok nelkul. */
export function alairtMegtekintesSuti(
  rendelesIdk: readonly string[],
  most: Date = new Date(),
  kulcs: string | null = titok(),
): string | null {
  const idk = rendelesIdk.filter((id) => /^[A-Za-z0-9_]+$/.test(id))
  if (!kulcs || !idk.length) return null
  const lejarat = Math.floor(most.getTime() / 1000) + MEGTEKINTES_ELETTARTAM_MP
  const szoveg = `${lejarat}.${idk.join(",")}`
  return `${szoveg}.${alairas(kulcs, szoveg)}`
}

/** Igaz, ha a suti ervenyes, nem jart le, es megnevezi ezt a rendelest. */
export function megtekintesEngedelyezett(
  suti: string | undefined | null,
  rendelesId: string,
  most: Date = new Date(),
  kulcs: string | null = titok(),
): boolean {
  if (!suti || !kulcs || !rendelesId) return false
  const resz = suti.split(".")
  if (resz.length !== 3) return false
  const [lejaratSzoveg, idk, kapott] = resz as [string, string, string]
  if (!egyezik(alairas(kulcs, `${lejaratSzoveg}.${idk}`), kapott)) return false
  const lejarat = Number(lejaratSzoveg)
  if (!Number.isFinite(lejarat) || lejarat < Math.floor(most.getTime() / 1000))
    return false
  return idk.split(",").includes(rendelesId)
}
