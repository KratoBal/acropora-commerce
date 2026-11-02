/**
 * A VÁLTOZAT NEVE A KOSÁRSORBAN: A MEDUSA ALAPÉRTELMEZETT NEVE NEM VÁLTOZAT.
 *
 * Egy egyváltozatú terméknek a Medusa a `Default` nevet adja. Az nem a vevőnek
 * szóló szó (nincs mit választani), és angol: a magyar sorban `Default`
 * állna a terméknév alatt. Minden más név (méret, szín, kiszerelés) megjelenik.
 *
 * Az összehasonlítás kis- és nagybetűtől és szélső szóköztől független, mert a
 * név az importból érkezik, és ott a betűzés nem garantált.
 */
export function valtozatNev(title: string | null | undefined): string | null {
  const nev = (title ?? "").trim()
  if (nev === "" || nev.toLowerCase() === "default") return null
  return nev
}
