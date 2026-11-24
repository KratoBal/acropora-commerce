"use server"

import { headers } from "next/headers"

import { sdk } from "@lib/config"
import { LOCALES } from "@lib/i18n/locale"
import { sebessegKorlat } from "@lib/util/hirlevel-feliratkozas"
import {
  JELSZO_KERES_UT,
  UJ_JELSZO_UT,
  jelszoKeresBeallitas,
  jelszoVisszaallitasKeres,
  ujJelszoBeallit,
  type JelszoKeresAllapot,
  type UjJelszoAllapot,
} from "@lib/util/jelszo-visszaallitas"

/** Latogatonkent (IP) ot kerest tiz percenkent, ebben a kirakat-folyamatban (a bolt cimenkent is korlatoz). */
const korlat = sebessegKorlat({ max: 5, ablakMs: 10 * 60 * 1000 })

/**
 * AZ ELFELEJTETT JELSZO URLAPJA (kartya 7bfca4eb). A latogato cime a Traefik `x-real-ip` fejlece (azt a proxy irja felul, a
 * latogato nem allithatja); ha nincs (helyi futas), egy kozos kulcs all. A valasz altalanos: nem mondja meg, van-e fiok.
 */
export async function jelszoVisszaallitasAkcio(
  _elozo: unknown,
  formData: FormData,
): Promise<JelszoKeresAllapot | null> {
  const ip = (await headers()).get("x-real-ip")?.trim() || "ismeretlen"
  return jelszoVisszaallitasKeres(
    {
      email: String(formData.get("email") ?? ""),
      ip,
      nyelv: LOCALES.find((l) => l === formData.get("locale")),
    },
    {
      korlat,
      kuld: (torzs) =>
        sdk.client.fetch(JELSZO_KERES_UT, jelszoKeresBeallitas(torzs)),
    },
  )
}

/**
 * AZ UJ JELSZO URLAPJA: a levelben kapott token a rejtett mezobol jon, a bolt egyszer, 15 percig fogadja el. A jelszavak es a
 * token nem mennek vissza az urlapra.
 */
export async function ujJelszoAkcio(
  _elozo: unknown,
  formData: FormData,
): Promise<UjJelszoAllapot | null> {
  return ujJelszoBeallit(
    {
      token: String(formData.get("token") ?? ""),
      jelszo: String(formData.get("password") ?? ""),
      jelszoUjra: String(formData.get("password_again") ?? ""),
    },
    {
      kuld: ({ token, password }) =>
        sdk.client.fetch(UJ_JELSZO_UT, {
          method: "POST",
          headers: { authorization: `Bearer ${token}` },
          body: { password },
          cache: "no-store",
        }),
    },
  )
}
