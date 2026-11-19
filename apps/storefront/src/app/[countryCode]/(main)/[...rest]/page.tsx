import { notFound } from "next/navigation"

/**
 * AZ ISMERETLEN CIM IS A BOLT KERETEBEN ALLO 404-ET KAPJA (2026-11-19, kirakat-kinezet
 * lista). Ket kulonbozo "Nincs ilyen oldal" volt: egy ismeretlen termek vagy kategoria
 * a (main) elrendezesben, fejleccel, keresovel es lablecel jott, egy teljesen ismeretlen
 * cim (`/hu/kapcsolat`, `/hu/rolunk`) viszont a gyoker not-found-ja volt, keret nelkul,
 * csak egy "Vissza a fooldalra" linkkel. A Next.js az utat illeszto oldal nelkul csak a
 * gyoker not-found-jat tudja, ezert ez a mindent elkapo oldal a (main) alatt
 * all: a konkret utak (store, categories, account, ...) elobbre valok nala, ami
 * marad, az ide esik, es a `notFound()` a (main) not-found-jat adja, 404 allapottal.
 */
/*
 * ISR (FE-7): `generateStaticParams` nelkul a dinamikus szegmens minden keresre ujra
 * renderelne, `private, no-store` valasszal (merve 2026-10-07). Az ures lista: nincs
 * elore epites, az elso keres epit, a 404 is gyorsitotarba kerul.
 */
export const revalidate = 300

export async function generateStaticParams() {
  return []
}

export default function NemLetezoOldal(): never {
  notFound()
}
