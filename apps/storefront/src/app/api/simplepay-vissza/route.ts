import { removeCartId } from "@lib/data/cookies"
import { simplePayVisszateres } from "@lib/data/simplepay"
import { NextRequest, NextResponse } from "next/server"

/**
 * A SIMPLEPAY VISSZATERESI CIME (P4-4): ide iranyitja vissza a vevot a
 * SimplePay fizetooldala, `r` es `s` parameterrel (3.12). A hatter
 * `SIMPLEPAY_BACK_URL` beallitasa ERRE az utra mutasson; az `api` elotag a
 * middleware-en kivul esik, tehat nem iranyitodik at orszagkodos utra.
 *
 * Amit itt kell elvegezni, es a lapon nem lehet: a SIKERES fizetes utan a
 * kosar sutijet levesszuk (a kosarbol rendeles lett), ahogy a `placeOrder` is
 * teszi. Sutit csak utvonal-kezelo vagy szerver-muvelet irhat.
 *
 * Utana az eredmeny-lapra visz, ugyanazzal az `r` es `s` parameterrel: a lap
 * maga kerdezi meg a hattert, tehat a kiirt eredmeny nem az URL-bol jon.
 * A bolt ma csak magyar regioban arul, ezert a lap a `/hu` alatt all.
 */
export async function GET(req: NextRequest) {
  const { origin, searchParams } = req.nextUrl
  const r = searchParams.get("r") ?? ""
  const s = searchParams.get("s") ?? ""
  const cel = new URL(`${origin}/hu/checkout/simplepay`)

  if (r && s) {
    const valasz = await simplePayVisszateres(r, s)

    if (valasz?.status === "paid") {
      await removeCartId()
    }

    cel.searchParams.set("r", r)
    cel.searchParams.set("s", s)
  }

  return NextResponse.redirect(cel)
}
