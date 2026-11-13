/**
 * A VÁLTOZAT NEVE A KOSÁRSORBAN: A MEDUSA ALAPÉRTELMEZETT NEVE ÉS A TERMÉKNEV MÁSOLATA NEM VÁLTOZAT.
 *
 * Egy egyváltozatú terméknek a Medusa a `Default` nevet adja. Az nem a vevőnek
 * szóló szó (nincs mit választani), és angol: a magyar sorban `Default`
 * állna a terméknév alatt. Minden más név (méret, szín, kiszerelés) megjelenik.
 *
 * A TERMÉKNÉV MÁSOLATA SEM VÁLTOZAT (acrobot 49644, a teszt kosáron mérve): az importált egyváltozatú élő állat
 * változatának a címe szó szerint a terméknév („Amphiprion ocellaris (L) (Bohóchal)” kétszer állt a sorban és a pénztár
 * oldalsávjában). Ha a két név megegyezik, a változat nevét nem írjuk ki.
 *
 * Az összehasonlítás kis- és nagybetűtől, szélső és többszörös szóköztől független, mert a
 * név az importból érkezik, és ott a betűzés nem garantált.
 */
const egyszerusit = (szoveg: string) =>
  szoveg.trim().replace(/\s+/g, " ").toLowerCase()

export function valtozatNev(
  title: string | null | undefined,
  termekNev?: string | null,
): string | null {
  const nev = (title ?? "").trim()
  if (nev === "" || nev.toLowerCase() === "default") return null
  if (termekNev && egyszerusit(nev) === egyszerusit(termekNev)) return null
  return nev
}
