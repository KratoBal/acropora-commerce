/**
 * A JOGI KAPU TESZT-MODJA A KIRAKATON (Balazs, 2026-11-02 10:05 UTC, acrobot
 * 39964). A Fogyasztobarat csak a shop.acropora.hu domaint fogadja el, masik
 * domainre Balazs nem fizet elo, ezert a TESZT kirakat Fogyasztobarat nelkul is
 * fogad rendelest, az eles nem. A hatter ugyanezt a szabalyt tartja
 * (`legal-documents.ts`, `LEGAL_GATE_MODE`); a ketto egyezeset a
 * `jogi-kapu.spec.ts` rogziti, es a rekordba kerulo verzio-osszevetes (a
 * hatter 409-e) akkor is megfogja az elcsuszast, ha valaki egyik oldalt
 * elfelejti.
 *
 * ALAPBOL ES MINDEN KETSEGNEL `enforce`: a teszt-mod csak a pontos `test`
 * ertekre kapcsol be, es csak akkor, ha a kirakat cime (NEXT_PUBLIC_BASE_URL)
 * olvashato es NEM az eles bolt. Az ertek a buildbe eg, a valtas uj buildet ker.
 *
 * NINCS SAJAT ASZF-SZOVEG: a teszt-modban a penztar az ASZF-pipa helyen csak
 * azt mondja, honnan jonnek majd a dokumentumok.
 */
export const ELO_KIRAKAT_HOSZTOK = [
  "shop.acropora.hu",
  "www.shop.acropora.hu",
  "acropora.hu",
  "www.acropora.hu",
] as const

/** A rekord verzioja teszt-modban: a hatter ugyanezt irja (`LEGAL_TEST_MODE_VERSION`). */
export const ASZF_VERZIO_TESZT_MOD = "teszt-mod"

/** A penztar ASZF-pipajanak helyen allo mondat teszt-modban. */
export const JOGI_TESZT_SZOVEG =
  "Teszt kirakat: a jogi dokumentumok az átálláskor a Fogyasztóbarátból jönnek."

export function jogiKapuTesztMod(
  kert: string | undefined = process.env.NEXT_PUBLIC_LEGAL_GATE_MODE,
  kirakatCim: string | undefined = process.env.NEXT_PUBLIC_BASE_URL,
): boolean {
  if (kert?.trim() !== "test") return false
  let host: string | null = null
  try {
    host = kirakatCim?.trim() ? new URL(kirakatCim.trim()).hostname : null
  } catch {
    host = null
  }
  if (!host) return false
  return !(ELO_KIRAKAT_HOSZTOK as readonly string[]).includes(
    host.toLowerCase(),
  )
}
