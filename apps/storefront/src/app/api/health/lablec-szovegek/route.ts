import { NextResponse } from "next/server"

import { LABLEC_MINTA_SZOVEGEK } from "@modules/lablec-oldalak/minta-allapot"

/**
 * HANY LABLEC-OLDAL VISEL MEG NEM EGYEZTETETT SZOVEGET (commerce-audit-p1,
 * acrobot 2026-10-27 19:58 UTC). A Fizetes es a Szallitas oldal a regi bolt
 * 2026-09-02-i szovege; az arak, a kuszobok es a nehez aru Balazs egyeztetesere
 * varnak (d707cf5f). Az elesitesi lista kerdese: nulla-e a szam. Ugyanaz az
 * alak, mint a `kezdolap-minta` kapue: kulcsokat ad, szoveget nem.
 *
 * `force-dynamic` es `/api` alatt: a build-ideju valasz ne maradjon meg.
 */
export const dynamic = "force-dynamic"

export async function GET() {
  const kulcsok = LABLEC_MINTA_SZOVEGEK.map((m) => m.kulcs)
  return NextResponse.json({
    status: kulcsok.length === 0 ? "ok" : "sample_texts_remain",
    count: kulcsok.length,
    keys: kulcsok,
  })
}
