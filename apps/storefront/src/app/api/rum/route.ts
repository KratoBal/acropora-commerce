import { NextResponse, type NextRequest } from "next/server"

import { ervenyesRumTorzs, RUM_MAX_BAJT } from "@lib/util/rum"

/**
 * A RUM MERESEK FOGADASA (FE-7). A bongeszo `sendBeacon`-nel kuldi a Core Web
 * Vitals erteket (`modules/common/components/rum-jelento`), es ez az ut egy
 * JSON sort ir a kirakat naplojaba (`{"rum":1,...}`). Ez a meresi vegpont: a
 * naplobol oldaltipusonkent osszesitheto, kulso szolgaltatas nelkul.
 *
 * VEDELEM, mert kivulrol barki hivhatja:
 *   - a torzs legfeljebb `RUM_MAX_BAJT` bajt, kulonben 413;
 *   - csak a negy ismert mezo, ismert ertekkel (`ervenyesRumTorzs`), kulonben
 *     400: a naploba nem kerulhet tetszoleges szoveg;
 *   - URL, suti, IP nem kerul a sorba.
 * A keresszam-korlat a proxy dolga (infra), nem ezé az ute.
 *
 * `/api` alatt all, tehat a middleware orszagkod-atiranyitasa nem er hozza.
 */
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const hossz = Number(request.headers.get("content-length") ?? "0")
  if (hossz > RUM_MAX_BAJT) return new NextResponse(null, { status: 413 })

  const szoveg = await request.text()
  if (new TextEncoder().encode(szoveg).length > RUM_MAX_BAJT)
    return new NextResponse(null, { status: 413 })

  let nyers: unknown
  try {
    nyers = JSON.parse(szoveg)
  } catch {
    return new NextResponse(null, { status: 400 })
  }
  const torzs = ervenyesRumTorzs(nyers)
  if (!torzs) return new NextResponse(null, { status: 400 })

  console.log(JSON.stringify({ rum: 1, ...torzs }))
  return new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  })
}
