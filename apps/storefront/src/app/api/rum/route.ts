import { NextResponse, type NextRequest } from "next/server"

import { ervenyesRumTorzs, RUM_MAX_BAJT } from "@lib/util/rum"

/**
 * A RUM MERESEK FOGADASA (FE-7). A bongeszo `sendBeacon`-nel kuldi a Core Web
 * Vitals erteket (`modules/common/components/rum-jelento`), es ez az ut egy
 * JSON sort ir a kirakat naplojaba (`{"rum":1,...}`). Ez a meresi vegpont: a
 * naplobol oldaltipusonkent osszesitheto, kulso szolgaltatas nelkul.
 *
 * VEDELEM, mert kivulrol barki hivhatja:
 *   - a torzs legfeljebb `RUM_MAX_BAJT` bajt, kulonben 413; folyamkent
 *     olvassuk, tehat `content-length` nelkul sem olvassuk be a tobbit;
 *   - csak a negy ismert mezo, ismert ertekkel (`ervenyesRumTorzs`), kulonben
 *     400: a naploba nem kerulhet tetszoleges szoveg;
 *   - URL, suti, IP nem kerul a sorba.
 * A keresszam-korlat a proxy dolga (infra), nem ezé az ute: kivulrol
 * barmennyi ervenyes sor irathato a naploba, es ezt csak a proxy korlatozza.
 *
 * `/api` alatt all, tehat a middleware orszagkod-atiranyitasa nem er hozza.
 */
export const dynamic = "force-dynamic"

export async function POST(request: NextRequest) {
  const hossz = Number(request.headers.get("content-length") ?? "0")
  if (hossz > RUM_MAX_BAJT) return new NextResponse(null, { status: 413 })

  const szoveg = await korlatosTorzs(request)
  if (szoveg === null) return new NextResponse(null, { status: 413 })

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

/**
 * A torzs FOLYAMKENT, legfeljebb `RUM_MAX_BAJT` bajtig (barracuda, #530). A
 * `content-length` hianyozhat (darabolt atvitel), es akkor a `request.text()`
 * a teljes torzset beolvasna, mielott elvetne. Igy a korlat folott a
 * beolvasas megszakad, es `null` jon vissza (413).
 */
export async function korlatosTorzs(request: Request): Promise<string | null> {
  if (!request.body) return ""
  const olvaso = request.body.getReader()
  const darabok: Uint8Array[] = []
  let hossz = 0
  for (;;) {
    const { done, value } = await olvaso.read()
    if (done) break
    hossz += value.byteLength
    if (hossz > RUM_MAX_BAJT) {
      await olvaso.cancel().catch(() => undefined)
      return null
    }
    darabok.push(value)
  }
  const egyben = new Uint8Array(hossz)
  let hely = 0
  for (const darab of darabok) {
    egyben.set(darab, hely)
    hely += darab.byteLength
  }
  return new TextDecoder().decode(egyben)
}
