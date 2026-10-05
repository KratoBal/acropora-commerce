"use client"

import { useEffect, useState } from "react"

import {
  dokumentumForras,
  fogyasztobaratBekapcsolva,
  fogyasztobaratHibakod,
  tisztitottJogiSzoveg,
} from "@lib/util/fogyasztobarat"

type Allapot =
  | { tipus: "toltes" }
  | { tipus: "kesz"; html: string }
  | { tipus: "hiba"; uzenet: string }
  | { tipus: "eles-cimen" }

/**
 * EGY FOGYASZTOBARAT-DOKUMENTUM TARTALMA. A BONGESZO keri le, mert a
 * Fogyasztobarat a Referer szerint dont (lasd `lib/util/fogyasztobarat.ts`), es
 * a tisztitas UTAN kerul a lapra: szkript, esemenykezelo es stilus nem marad.
 */
export default function JogiDokumentumTartalom({
  kulcs,
  forrasCim,
  maiBoltCim,
  bekapcsolva = fogyasztobaratBekapcsolva(),
}: {
  /** A kapcsolo; a teszt adja at, egyebkent a kornyezetbol jon. */
  bekapcsolva?: boolean
  kulcs: string
  /** A mai bolt megfelelo oldala, a teszt kirakat helyettesito szovegehez. */
  maiBoltCim?: string
  /** A forras teljes cime a "megnyitom a Fogyasztobaratnal" linkhez. */
  forrasCim?: string
}) {
  // KIKAPCSOLVA nincs lekeres: rogton a helyettesito szoveg (acrobot 26244)
  const [allapot, setAllapot] = useState<Allapot>(
    bekapcsolva ? { tipus: "toltes" } : { tipus: "eles-cimen" },
  )
  const forras = forrasCim ?? dokumentumForras(kulcs)

  useEffect(() => {
    if (!bekapcsolva) return
    const vezerlo = new AbortController()
    fetch(forras, { signal: vezerlo.signal })
      .then(async (valasz) => {
        const szoveg = await valasz.text()
        const hibakod = fogyasztobaratHibakod(szoveg)
        // 1002: nem a bejegyzett domain (a teszt kirakat). Eles cimen nem jon.
        if (hibakod === "1002") {
          setAllapot({ tipus: "eles-cimen" })
          return
        }
        if (!valasz.ok || hibakod) {
          setAllapot({
            tipus: "hiba",
            uzenet: `A dokumentum most nem tölthető be${hibakod ? ` (hibakód: ${hibakod})` : ""}.`,
          })
          return
        }
        const html = tisztitottJogiSzoveg(szoveg)
        setAllapot(
          html
            ? { tipus: "kesz", html }
            : { tipus: "hiba", uzenet: "A dokumentum üres választ adott." },
        )
      })
      .catch(() => {
        if (!vezerlo.signal.aborted)
          setAllapot({
            tipus: "hiba",
            uzenet: "A dokumentum most nem tölthető be. Próbáld újra később.",
          })
      })
    return () => vezerlo.abort()
  }, [bekapcsolva, forras])

  if (allapot.tipus === "toltes")
    return (
      <p className="txt-medium text-ui-fg-subtle" data-testid="jogi-toltes">
        Betöltés…
      </p>
    )
  if (allapot.tipus === "eles-cimen")
    return (
      <p className="txt-medium text-ui-fg-subtle" data-testid="jogi-eles-cimen">
        A dokumentum az éles címen jelenik meg.
        {maiBoltCim ? (
          <>
            {" "}
            Addig a mai boltban olvashatod:{" "}
            <a
              href={maiBoltCim}
              className="underline"
              rel="noopener noreferrer"
            >
              megnyitom
            </a>
            .
          </>
        ) : null}
      </p>
    )
  if (allapot.tipus === "hiba")
    return (
      <p
        role="alert"
        className="txt-medium text-ui-fg-subtle"
        data-testid="jogi-hiba"
      >
        {allapot.uzenet}
      </p>
    )
  return (
    <div
      data-testid="jogi-tartalom"
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: allapot.html }}
    />
  )
}
