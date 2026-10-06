import { timingSafeEqual } from "node:crypto"
import { revalidateTag } from "next/cache"
import { NextResponse, type NextRequest } from "next/server"

/**
 * A KIRAKAT GYORSITOTARANAK URITESE ARVALTOZASKOR (kartya 2d22116c; Balazs
 * 2026-10-06 22:05 UTC, „Mehet a 2,7,6,8”, csak teszt kirakat).
 *
 * A termek-lekeres `force-cache` (`lib/data/products.ts`), tehat a vevo addig
 * a regi arat latja, amig valami nem uriti -- eddig csak egy uj telepites. A
 * backend az ar-modul esemenyere (`pricing.price.*`) ezt az utat hivja, es a
 * KOZOS `products` cimke (`getCacheOptions`) egy hivassal minden latogato
 * bejegyzeset uriti.
 *
 * VEDELEM: a `STOREFRONT_REVALIDATE_SECRET` az `x-revalidate-secret`
 * fejlecben, allando ideju osszevetessel. Titok nelkul az ut NINCS (404), es
 * csak az engedelyezett cimke urithato: kivulrol barmit urito vegpont
 * tulterhelesi eszkoz lenne.
 *
 * `/api` alatt all, tehat a middleware orszagkod-atiranyitasa nem er hozza.
 */
export const dynamic = "force-dynamic"

export const URITHETO_CIMKEK = ["products"] as const

const egyezik = (kapott: string | null, vart: string) => {
  const kodolo = new TextEncoder()
  const a = kodolo.encode(kapott ?? "")
  const b = kodolo.encode(vart)
  // a hossz osszevetese elott is allando ido: a rovidebbet kiparnazzuk
  const parnazott = new Uint8Array(b.length)
  parnazott.set(a.subarray(0, b.length))
  return timingSafeEqual(parnazott, b) && a.length === b.length
}

export async function POST(request: NextRequest) {
  const titok = process.env.STOREFRONT_REVALIDATE_SECRET?.trim()
  if (!titok) return new NextResponse(null, { status: 404 })
  if (!egyezik(request.headers.get("x-revalidate-secret"), titok))
    return NextResponse.json({ message: "unauthorized" }, { status: 401 })

  let torzs: { tags?: unknown } = {}
  try {
    torzs = await request.json()
  } catch {
    return NextResponse.json({ message: "invalid body" }, { status: 400 })
  }
  const kert = Array.isArray(torzs.tags) ? torzs.tags : []
  const cimkek = URITHETO_CIMKEK.filter((cimke) => kert.includes(cimke))
  if (!cimkek.length || cimkek.length !== kert.length)
    return NextResponse.json(
      { message: `csak ezek uríthetők: ${URITHETO_CIMKEK.join(", ")}` },
      { status: 400 },
    )

  for (const cimke of cimkek) revalidateTag(cimke)
  return NextResponse.json({ revalidated: cimkek })
}
