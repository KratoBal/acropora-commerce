import { NextResponse } from "next/server"

import { kezdolapTartalom } from "@lib/data/kezdolap-tartalom"
import { maradtMinta } from "@modules/kezdolap/szovegek"

/**
 * HANY KITALALT TENY ALL MEG A KEZDOLAPON (commerce-audit-p1, S7).
 *
 * A kezdolap ertekelese, velemenyei, cime, nyitvatartasa es hasonlo tenyei a
 * terv kezdoertekei, es a lapon a `MintaJelzo` cimke jelzi oket, amig az OS nem
 * ir hozajuk sajat erteket. Eles lapon kitalalt ertekeles bizalmi es
 * fogyasztovedelmi kockazat, ezert az elesitesi lista kerdese nem az, hogy "meg
 * kell nezni a kepernyot", hanem: nulla-e a szam. Ez a szam.
 *
 * Csak kulcsokat ad, ertekeket nem (a kulcsok a kezdolap szerkesztojenek
 * nyilvanos mezonevei). `force-dynamic` es `/api` alatt, mint a
 * `health/release`: a build-ideju valasz ne maradjon meg.
 */
export const dynamic = "force-dynamic"

export async function GET() {
  const tartalom = await kezdolapTartalom().catch(() => undefined)
  // a bolt elerhetetlen: nem tudjuk, ezt nem szabad "nulla"-nak olvasni
  if (tartalom === undefined) {
    return NextResponse.json({ status: "unknown" }, { status: 503 })
  }
  const maradt = maradtMinta(tartalom?.texts ?? null)
  return NextResponse.json({
    status: maradt.length === 0 ? "ok" : "sample_facts_remain",
    count: maradt.length,
    keys: maradt,
  })
}
