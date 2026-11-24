import { en } from "./dictionary/en"
import { hu } from "./dictionary/hu"

/**
 * A VEVŐI SZÖVEGEK KATALÓGUSA (kártya 7bfca4eb; Balázs, 2026-11-24: „minden a vevőknek szóló … szöveget mi szeretnénk
 * szerkeszthetőben látni”, és „ne összevissza legyenek”). A szótár azon szövegei, amelyek a vevő útjához tartoznak, a vevő útja
 * szerinti csoportokban, mindkét nyelv alapértékével. EGY FORRÁS: a backend (`modules/customer-texts/catalog.generated.ts`) ebből
 * generált másolatot tart, és a `vevoi-szoveg-katalogus.spec.ts` piros, ha a kettő eltér; az OS ezt kéri le, nem tart sajátot.
 *
 * NEM KERÜL BE: a felületi és katalógus-szöveg (termék, kategória, keresés, menü), a kezdőlap, a fejléc és a lábléc (azokat a
 * Kezdőlap szerkesztője viszi), és a még kitöltetlen helyőrző (a jogi jelölők, az élő állatos szöveg): az jogi jóváhagyás, nem
 * szerkesztés.
 */

/** A csoportok a vevő útja szerint, a lap sorrendjében (acrobot 60632). A levelek csoportja az OS-é (Levélsablonok), itt nincs. */
export const VEVOI_SZOVEG_CSOPORTOK = [
  {
    id: "penztar",
    from: [
      "cart",
      "cartMenu",
      "cartPage",
      "checkoutPage",
      "checkoutShipping",
      "checkoutPayment",
    ],
  },
  { id: "rendeles-leadva", from: ["orderConfirmed"] },
  { id: "rendeles-allapota", from: ["guestOrder"] },
  { id: "elallas", from: ["guestOrder.withdrawal"] },
  { id: "hibabejelentes", from: ["guestOrder.problem"] },
  { id: "fiok", from: ["account"] },
  {
    id: "hirlevel",
    from: [
      "newsletter",
      "newsletterLink",
      "stockAlert",
      "stockAlertLink",
      "livestockArrival",
    ],
  },
  { id: "suti", from: ["cookieConsent"] },
] as const

export type VevoiSzovegCsoport = (typeof VEVOI_SZOVEG_CSOPORTOK)[number]["id"]

export interface VevoiSzoveg {
  key: string
  group: VevoiSzovegCsoport
  hu: string
  en: string
}

const HELYORZO = /KITÖLTENDŐ|TO BE FILLED/

const levelek = (prefix: string, value: unknown): [string, string][] =>
  typeof value === "string"
    ? [[prefix, value]]
    : value && typeof value === "object"
      ? Object.entries(value).flatMap(([k, v]) =>
          levelek(prefix ? `${prefix}.${k}` : k, v),
        )
      : []

const ertek = (dict: unknown, key: string): unknown =>
  key
    .split(".")
    .reduce<unknown>(
      (o, k) =>
        o && typeof o === "object"
          ? (o as Record<string, unknown>)[k]
          : undefined,
      dict,
    )

/** A leghosszabb illeszkedő forrás dönt: a `guestOrder.withdrawal` az elállásé, a többi `guestOrder` a rendelés állapotáé. */
const csoportja = (key: string): VevoiSzovegCsoport | null => {
  let best: { id: VevoiSzovegCsoport; len: number } | null = null
  for (const csoport of VEVOI_SZOVEG_CSOPORTOK)
    for (const from of csoport.from)
      if (
        (key === from || key.startsWith(`${from}.`)) &&
        (!best || from.length > best.len)
      )
        best = { id: csoport.id, len: from.length }
  return best?.id ?? null
}

/** A katalógus, a szótár sorrendjében; egy kulcs csak akkor, ha mindkét nyelven szöveg és egyiken sem helyőrző. */
export function vevoiSzovegKatalogus(): VevoiSzoveg[] {
  const out: VevoiSzoveg[] = []
  for (const [key, huText] of levelek("", hu)) {
    const group = csoportja(key)
    if (!group) continue
    const enText = ertek(en, key)
    if (
      typeof enText !== "string" ||
      HELYORZO.test(huText) ||
      HELYORZO.test(enText)
    )
      continue
    out.push({ key, group, hu: huText, en: enText })
  }
  return out
}
