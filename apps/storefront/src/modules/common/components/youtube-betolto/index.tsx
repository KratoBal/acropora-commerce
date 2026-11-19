"use client"

import { useEffect } from "react"

import {
  betoltoIframeCim,
  YOUTUBE_AZONOSITO_MINTA,
} from "@lib/util/youtube-helyorzo"

/**
 * A YOUTUBE-HELYORZOK KATTINTASRA TOLTODNEK (kartya dc8cabd2). A termekleiras a tisztitott HTML-bol jon
 * (`dangerouslySetInnerHTML`), ezert a gombokat EGY dokumentum-szintu figyelo kezeli: egy `[data-yt-betolt]` gombra kattintva a
 * helyorzo tartalma egy `youtube-nocookie.com` iframe-re cserelodik. Az azonositot ujra ellenorzi (a jelolest a DOM-bol olvassa),
 * az iframe-et DOM-API-val hozza letre (nincs `innerHTML`), es semmit nem jegyez meg: sem sutit, sem tarolast.
 *
 * Amig nincs kattintas, ez a komponens SEMMIT nem tolt es nem hiv.
 */
export function videoBetoltese(gomb: Element): boolean {
  const azonosito = gomb.getAttribute("data-yt-betolt") ?? ""
  const helyorzo = gomb.closest("[data-yt-embed]")
  if (!helyorzo || !YOUTUBE_AZONOSITO_MINTA.test(azonosito)) return false
  if (helyorzo.getAttribute("data-yt-embed") !== azonosito) return false
  const keret = document.createElement("iframe")
  // attributumkent, nem tulajdonsagkent: nem minden kornyezet tukrozi az `allow` es a `referrerPolicy` tulajdonsagot
  keret.setAttribute("src", betoltoIframeCim(azonosito))
  keret.setAttribute("title", "YouTube videó")
  keret.setAttribute(
    "allow",
    "accelerometer; autoplay; encrypted-media; picture-in-picture; fullscreen",
  )
  keret.setAttribute("allowfullscreen", "")
  keret.setAttribute("referrerpolicy", "strict-origin-when-cross-origin")
  keret.setAttribute("class", "aspect-video h-full w-full")
  helyorzo.replaceChildren(keret)
  return true
}

export default function YoutubeBetolto() {
  useEffect(() => {
    const figyelo = (esemeny: MouseEvent) => {
      const cel = esemeny.target
      if (!(cel instanceof Element)) return
      const gomb = cel.closest("[data-yt-betolt]")
      if (gomb && videoBetoltese(gomb)) esemeny.preventDefault()
    }
    document.addEventListener("click", figyelo)
    return () => document.removeEventListener("click", figyelo)
  }, [])
  return null
}
