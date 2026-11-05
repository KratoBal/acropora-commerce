import { NextResponse, type NextRequest } from "next/server"

import { sdk } from "@lib/config"
import { hibaAllapota } from "@lib/util/kedvezmeny-uzenet"
import { korlatosTorzs } from "@lib/util/korlatos-torzs"
import { PROBLEM_PHOTO_MAX_BODY_BYTES } from "@lib/util/problem-photo-upload"
import {
  engedelyezett,
  fotoKorlat,
  latogatoKulcs,
} from "@lib/util/vendeg-korlat"

/** Latogatonkent (IP) a kep-feltoltesek korlatja, ebben a kirakat-folyamatban (lasd `vendeg-korlat.ts`). */
const korlat = fotoKorlat()

/**
 * A "PROBLÉMA A SZÁLLÍTMÁNNYAL" KÉPEINEK FELTÖLTÉSE (V1.2), KÜLÖN ÚTON. Egy kép legfeljebb 5 MB, base64 szövegként kb.
 * 7 MB; a szerver-műveletek törzskorlátja ehhez globálisan 8 MB-ra volt emelve, és az MINDEN szerver-műveletre
 * érvényes volt. Ez az út a saját korlátját tartja (`PROBLEM_PHOTO_MAX_BODY_BYTES`), a szerver-műveletek visszakerültek
 * a Next alapértelmezésére (1 MB).
 *
 * VÉDELEM, mert kívülről bárki hívhatja:
 *   - csak azonos eredetű kérés (az `Origin` fejléc a kiszolgáló gazdájára mutat): a szerver-műveletek is ezt
 *     ellenőrzik, és az út nem lehet gyengébb náluk;
 *   - a törzs a határig folyamként olvasódik, `content-length` nélkül is (413 a fölött);
 *   - a törzs szerkezetét és a kép méretét/típusát a backend ellenőrzi a saját szabályával; ez az út csak továbbítja,
 *     és a backend állapotkódját adja vissza (a vevő oldala ebből dönti el, mit mond).
 * A kérésszám-korlát: a backendé (rendelésszámonként és címenként) ÉS a kirakaté látogatónként (`vendeg-korlat.ts`, az
 * `x-real-ip` szerint; fejléc nélkül nem számol).
 *
 * `/api` alatt áll, tehát a middleware országkód-átirányítása nem éri.
 */
export const dynamic = "force-dynamic"

/**
 * A GAZDANÉV ÖSSZEHASONLÍTÁSRA: kisbetűs, és az alapértelmezett port nélkül (a böngésző `Origin` fejléce az alapértelmezett
 * portot elhagyja, a proxy fejlécében viszont ott lehet).
 */
const gazdaAlakja = (gazda: string): string =>
  gazda
    .trim()
    .toLowerCase()
    .replace(/:(80|443)$/, "")

const hivoGazdaja = (request: NextRequest): string | null => {
  const eredet = request.headers.get("origin")
  if (!eredet) return null
  try {
    return gazdaAlakja(new URL(eredet).host)
  } catch {
    return null
  }
}

/**
 * A kiszolgáló gazdája: a proxy mögött az `x-forwarded-host`, amit több proxy vesszős LISTÁVAL is küldhet ("a, b"); az
 * első elem az, amit a böngésző kért (stage-próba, barracuda #668 review).
 */
const sajatGazda = (request: NextRequest): string | null => {
  const kapott =
    request.headers.get("x-forwarded-host")?.split(",")[0] ??
    request.headers.get("host")
  return kapott?.trim() ? gazdaAlakja(kapott) : null
}

export async function POST(request: NextRequest) {
  const hivo = hivoGazdaja(request)
  if (!hivo || hivo !== sajatGazda(request))
    return new NextResponse(null, { status: 403 })
  // a latogato korlatja a torzs beolvasasa ELOTT: a tul sok keres olcson, a nagy torzs elolvasasa nelkul esik el
  if (!engedelyezett(korlat, latogatoKulcs(request.headers)))
    return new NextResponse(null, { status: 429 })

  const hossz = Number(request.headers.get("content-length") ?? "0")
  if (hossz > PROBLEM_PHOTO_MAX_BODY_BYTES)
    return new NextResponse(null, { status: 413 })
  const szoveg = await korlatosTorzs(request, PROBLEM_PHOTO_MAX_BODY_BYTES)
  if (szoveg === null) return new NextResponse(null, { status: 413 })

  let torzs: { order_number?: unknown; email?: unknown; content?: unknown }
  try {
    torzs = JSON.parse(szoveg)
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  if (
    typeof torzs?.order_number !== "string" ||
    typeof torzs.email !== "string" ||
    typeof torzs.content !== "string"
  )
    return new NextResponse(null, { status: 400 })

  try {
    const valasz = await sdk.client.fetch<{ photo_id?: string }>(
      "/store/guest-orders/problem-photos",
      {
        method: "POST",
        body: {
          order_number: torzs.order_number.trim(),
          email: torzs.email.trim(),
          content: torzs.content,
        },
        cache: "no-store",
      },
    )
    return valasz?.photo_id
      ? NextResponse.json(
          { photo_id: valasz.photo_id },
          { headers: { "Cache-Control": "no-store" } },
        )
      : new NextResponse(null, { status: 502 })
  } catch (hiba) {
    const allapot = hibaAllapota(hiba)
    // a rendelés-hiány nem kerül a naplóba (a keresés egyetlen válasza), a többi csak az állapotkóddal
    if (allapot !== 404)
      console.error(
        "A kép feltöltése nem sikerült:",
        allapot ?? "(nincs állapotkód)",
      )
    return new NextResponse(null, {
      status:
        allapot !== undefined && allapot >= 400 && allapot < 500
          ? allapot
          : 502,
    })
  }
}
