import type {
  KezdolapHirlevel,
  KezdolapTartalom,
} from "@modules/kezdolap/tartalom"

export type HirlevelAdat = {
  cim: string
  szoveg: string
  hozzajarulas: string
  gomb: string
}

/**
 * A SOR, AMIG AZ OS NEM ALLIT BE SAJATOT (`newsletter: null`), betuere a regi
 * bolt lablece. UGYANAZ a szoveg, mint a bolt `DEFAULT_NEWSLETTER`-e
 * (apps/backend/src/modules/newsletter/defaults.ts): a feliratkozas azt
 * rogziti hozzajarulaskent, tehat a lapon is annak kell allnia. A
 * `hirlevel-adat.spec.ts` a backend fajljabol meri az egyezest.
 */
export const HIRLEVEL_ALAP: KezdolapHirlevel = {
  enabled: true,
  title: "Hírlevél",
  text: "Iratkozz fel a hírlevelünkre és értesülj elsőként az újdonságokról, akciókról, ajánlatokról!",
  consent_text:
    "Hozzájárulok az adataim kezeléséhez és elfogadom az Adatkezelési tájékoztatót.",
  button: "Feliratkozás",
}

function ervenyesSor(x: unknown): KezdolapHirlevel | null {
  if (!x || typeof x !== "object") return null
  const s = x as Partial<KezdolapHirlevel>
  return typeof s.enabled === "boolean" &&
    typeof s.title === "string" &&
    typeof s.text === "string" &&
    typeof s.consent_text === "string" &&
    s.consent_text.trim() !== "" &&
    typeof s.button === "string" &&
    s.button.trim() !== ""
    ? (s as KezdolapHirlevel)
    : null
}

/**
 * A HIRLEVEL-SOR ADATA, vagy `null`, ha az OS kikapcsolta. Beallitatlan vagy
 * serult sor: a lap sajat sora (a bolt validatora a serultet amugy sem
 * engedi be, a lap megsem bizik benne, mint a lablecnel).
 */
export function hirlevelAdat(
  tartalom: KezdolapTartalom | null,
): HirlevelAdat | null {
  const sor = ervenyesSor(tartalom?.newsletter) ?? HIRLEVEL_ALAP
  if (!sor.enabled) return null
  return {
    cim: sor.title,
    szoveg: sor.text,
    hozzajarulas: sor.consent_text.trim(),
    gomb: sor.button.trim(),
  }
}

/**
 * A HOZZAJARULAS SZOVEGE, A TAJEKOZTATO KIFEJEZESE MENTEN KETTEVAGVA
 * (barracuda, #580): ha a szoveg maga nevezi meg az adatkezelesi tajekoztatot
 * (ragozva is, pl. „tájékoztatót”), az a kifejezes lesz a link, ahogy a
 * penztari pipa teszi; ha nem nevezi meg, `null`, es a lap a szoveg utan teszi
 * ki a linket. Igy a kifejezes nem all ketszer, es a latott szoveg pontosan az,
 * amit a bolt rogzit.
 */
export function hozzajarulasLinkkel(
  szoveg: string,
): { elotte: string; link: string; utana: string } | null {
  const talalat = /adatkezelési tájékoztató[a-záéíóöőúüű]*/i.exec(szoveg)
  if (!talalat) return null
  return {
    elotte: szoveg.slice(0, talalat.index),
    link: talalat[0],
    utana: szoveg.slice(talalat.index + talalat[0].length),
  }
}
