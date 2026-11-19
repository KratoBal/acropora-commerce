import { NextResponse, type NextRequest } from "next/server"

import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import { getBaseURL } from "@lib/util/env"
import { lablecAdat } from "@modules/layout/templates/footer/lablec-adat"
import { lablecLinkekHoszton } from "@modules/layout/templates/footer/hivatkozasok"

/**
 * A LABLEC REGI-BOLT LINKJEI (commerce-audit-p1, P1/11): az elesitesi kapu. Lasd
 * `lablecLinkekHoszton`. `?host=shop.acropora.hu` az atallas ELOTT megkerdezi,
 * hany link mutatna onmagara az elesites utan; parameter nelkul a szerver sajat
 * (`NEXT_PUBLIC_BASE_URL`) hosztjara. Csak cimkeket es cimeket ad, amik a
 * lablecben amugy is lathatok. `force-dynamic` es `/api` alatt, mint a
 * `health/release`.
 *
 * A KAPU A LABLECET NEZI, AHOGY A LAP RAJZOLJA (2026-11-19, murena): nem csak a
 * kod listajat, hanem az OS rekordjanak linkjeit is (`lablecAdat`). Eddig a
 * teszt OS rekordja ot linket vitt a regi boltba, a kapu pedig nullat mondott,
 * mert csak a kod sajat listajat olvasta. Ha a rekord nem olvashato, a valasz
 * 503 es "unknown": az ismeretlen nem nulla (mint a `kezdolap-minta` kapuban).
 */
export const dynamic = "force-dynamic"

const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?(:\d{1,5})?$/i

export async function GET(request: NextRequest) {
  const kert = request.nextUrl.searchParams.get("host")
  if (kert !== null && !HOST.test(kert)) {
    return NextResponse.json({ status: "bad_host" }, { status: 400 })
  }
  const host = kert ?? new URL(getBaseURL()).host
  const tartalom = await kezdolapTartalom().catch(() => undefined)
  if (tartalom === undefined) {
    return NextResponse.json({ status: "unknown" }, { status: 503 })
  }
  const rekordLinkek = lablecAdat(tartalom)
    .oszlopok.flatMap((o) => o.linkek)
    .map((l) => ({ cimke: l.cimke, cim: l.href }))
  const linkek = lablecLinkekHoszton(host, undefined, rekordLinkek)
  return NextResponse.json({
    status: linkek.length === 0 ? "ok" : "old_shop_links_remain",
    host,
    count: linkek.length,
    links: linkek,
  })
}
