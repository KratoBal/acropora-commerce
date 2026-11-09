"use server"

import { headers } from "next/headers"

import { sdk } from "@lib/config"
import { LOCALES } from "@lib/i18n/locale"
import { sebessegKorlat } from "@lib/util/hirlevel-feliratkozas"
import {
  hirlevelLink,
  type HirlevelLinkAllapot,
  type HirlevelLinkFajta,
} from "@lib/util/hirlevel-link"
import {
  SZOLJ_LINK_UT,
  szoljFeliratkozas,
  type SzoljAllapot,
} from "@lib/util/szolj-hasonlo"

/** Latogatonkent (IP) ot feliratkozas tiz percenkent, ebben a kirakat-folyamatban (a hirlevel korlatja). */
const korlat = sebessegKorlat({ max: 5, ablakMs: 10 * 60 * 1000 })

/**
 * "SZÓLJ, HA JÖN HASONLÓ" AZ ELADOTT DARAB LAPJAN (V2.4). A latogato cime a
 * Traefik `x-real-ip` fejlece, a hirlevel okabol (`hirlevel.ts`).
 */
export async function szoljFeliratkozasAkcio(
  _elozo: unknown,
  formData: FormData,
): Promise<SzoljAllapot> {
  const ip = (await headers()).get("x-real-ip")?.trim() || "ismeretlen"
  return szoljFeliratkozas(
    {
      email: String(formData.get("email") ?? ""),
      hozzajarul: formData.get("consent") === "on",
      termekId: String(formData.get("product_id") ?? ""),
      ip,
      nyelv: LOCALES.find((l) => l === formData.get("locale")),
    },
    {
      korlat,
      kuld: (torzs) =>
        sdk.client.fetch("/store/stock-alerts", {
          method: "POST",
          body: torzs,
          cache: "no-store",
        }),
    },
  )
}

/** A levelben kuldott ket link lapja: a gomb megnyomasa kuldi a tokent a bolthoz (a hirlevel linkjeinek szabalyaval). */
export async function szoljLinkKuldes(
  fajta: HirlevelLinkFajta,
  token: string,
): Promise<HirlevelLinkAllapot> {
  if (fajta !== "megerosites" && fajta !== "leiratkozas")
    return { allapot: "ervenytelen" }
  return hirlevelLink(token, (torzs) =>
    sdk.client.fetch(SZOLJ_LINK_UT[fajta], {
      method: "POST",
      body: torzs,
      cache: "no-store",
    }),
  )
}
