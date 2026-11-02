import type { Key, Translate } from "@lib/i18n/dictionary"

/**
 * A SZERVER-MŰVELET HIBÁJÁNAK SZÖVEGE A LAP NYELVÉN. A művelet a magyar mondatot
 * (`uzenet`, a naplónak és a régi hívóknak) ÉS a szótár-kulcsát (`kod`) adja; a
 * böngésző a kulcsot írja ki, a magyar mondat csak a tartalék (régi vagy kulcs
 * nélküli válasz).
 */
export const hibaSzoveg = (
  t: Translate,
  eredmeny: { uzenet: string; kod?: Key },
): string => (eredmeny.kod ? t(eredmeny.kod) : eredmeny.uzenet)
