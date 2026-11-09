"use server"

import { headers } from "next/headers"

import { sdk } from "@lib/config"
import { LOCALES } from "@lib/i18n/locale"
import {
  hirlevelFeliratkozas,
  sebessegKorlat,
  type HirlevelAllapot,
} from "@lib/util/hirlevel-feliratkozas"
import {
  HIRLEVEL_LINK_UT,
  hirlevelLink,
  type HirlevelLinkAllapot,
  type HirlevelLinkFajta,
} from "@lib/util/hirlevel-link"

/** Latogatonkent (IP) ot feliratkozas tiz percenkent, ebben a kirakat-folyamatban. */
const korlat = sebessegKorlat({ max: 5, ablakMs: 10 * 60 * 1000 })

/**
 * A LABLEC HIRLEVEL-URLAPJA (kirakat-lablec-kep). A latogato cime a Traefik
 * `x-real-ip` fejlece: azt a proxy irja felul, a latogato nem allithatja (az
 * `x-forwarded-for` elejet igen). Ha nincs (helyi futas), egy kozos kulcs all,
 * vagyis a korlat ott az egesz folyamatra szol.
 */
export async function hirlevelFeliratkozasAkcio(
  _elozo: unknown,
  formData: FormData,
): Promise<HirlevelAllapot> {
  const ip = (await headers()).get("x-real-ip")?.trim() || "ismeretlen"
  return hirlevelFeliratkozas(
    {
      nev: String(formData.get("name") ?? ""),
      email: String(formData.get("email") ?? ""),
      hozzajarul: formData.get("consent") === "on",
      ip,
      nyelv: LOCALES.find((l) => l === formData.get("locale")),
    },
    {
      korlat,
      kuld: (torzs) =>
        sdk.client.fetch("/store/newsletter-subscriptions", {
          method: "POST",
          body: torzs,
          cache: "no-store",
        }),
    },
  )
}

/**
 * A LEVELBEN KULDOTT KET LINK LAPJA (d707cf5f): a gomb megnyomasa kuldi a
 * tokent a bolthoz. Ismeretlen fajtara nem kuldunk semmit.
 */
export async function hirlevelLinkKuldes(
  fajta: HirlevelLinkFajta,
  token: string,
): Promise<HirlevelLinkAllapot> {
  if (fajta !== "megerosites" && fajta !== "leiratkozas")
    return { allapot: "ervenytelen" }
  return hirlevelLink(token, (torzs) =>
    sdk.client.fetch(HIRLEVEL_LINK_UT[fajta], {
      method: "POST",
      body: torzs,
      cache: "no-store",
    }),
  )
}
