"use client"

import type { Dictionary } from "@lib/i18n/dictionary"
import { hu } from "@lib/i18n/dictionary/hu"
import { useTranslate } from "@lib/i18n/use-translate"

/**
 * A MINTA-ADAT JELZOJE.
 *
 * Minden sav, ami a `minta-adat.ts` fajlbol olvas, ezt a cimket viseli. Nem
 * dekoracio: ez a kulonbseg egy hirdetes es egy helykitolto kozott.
 *
 * MIERT A LAPON ALL ES NEM CSAK A KODBAN: a kezdolap kepernyokepen utazik
 * tovabb (atadas, dontes, visszajelzes). Egy kodbeli megjegyzes a kepre nem
 * kerul ra, a cimke igen.
 *
 * MIERT NEM `title` VAGY `aria-label`: azok csak akkor latszanak, ha valaki
 * rajuk mozog. A jelzonek akkor is ott kell lennie, amikor senki nem keresi.
 */
type MintaMit = keyof Dictionary["sample"]

/** `mit`: egy szotar-kulcs (`sample.*`), vagy egy mar kesz szoveg (a lablec-oldalak magyar tartalma). */
const MintaJelzo = ({ mit }: { mit: MintaMit | (string & {}) }) => {
  const t = useTranslate()
  const mitSzoveg = (Object.keys(hu.sample) as string[]).includes(mit)
    ? t(`sample.${mit as MintaMit}`)
    : mit
  return (
    <span
      data-testid="minta-jelzo"
      className="inline-flex items-center gap-2 border px-2 py-1 text-[11px] font-semibold uppercase tracking-wide"
      style={{
        borderColor: "var(--terv-kiemel)",
        color: "var(--terv-kiemel-tinta)",
        background: "var(--terv-hatter-lap)",
      }}
    >
      {t("sample.label")}
      <span className="font-normal normal-case opacity-80">{mitSzoveg}</span>
    </span>
  )
}

export default MintaJelzo
