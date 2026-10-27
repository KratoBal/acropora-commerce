import { NextResponse, type NextRequest } from "next/server"

import { getBaseURL } from "@lib/util/env"
import { lablecLinkekHoszton } from "@modules/layout/templates/footer/hivatkozasok"

/**
 * A LABLEC REGI-BOLT LINKJEI (commerce-audit-p1, P1/11): az elesitesi kapu. Lasd
 * `lablecLinkekHoszton`. `?host=shop.acropora.hu` az atallas ELOTT megkerdezi,
 * hany link mutatna onmagara az elesites utan; parameter nelkul a szerver sajat
 * (`NEXT_PUBLIC_BASE_URL`) hosztjara. Csak cimkeket es cimeket ad, amik a
 * lablecben amugy is lathatok. `force-dynamic` es `/api` alatt, mint a
 * `health/release`.
 */
export const dynamic = "force-dynamic"

const HOST = /^[a-z0-9]([a-z0-9.-]{0,251}[a-z0-9])?(:\d{1,5})?$/i

export function GET(request: NextRequest) {
  const kert = request.nextUrl.searchParams.get("host")
  if (kert !== null && !HOST.test(kert)) {
    return NextResponse.json({ status: "bad_host" }, { status: 400 })
  }
  const host = kert ?? new URL(getBaseURL()).host
  const linkek = lablecLinkekHoszton(host)
  return NextResponse.json({
    status: linkek.length === 0 ? "ok" : "old_shop_links_remain",
    host,
    count: linkek.length,
    links: linkek,
  })
}
