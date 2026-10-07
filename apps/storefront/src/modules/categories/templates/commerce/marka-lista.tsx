import type { MarkaSor } from "@lib/util/marka-szuro"
import { szuroLinkRel } from "@lib/seo/szuro-link"

/**
 * A MARKA-LISTA (117:108): a kategorialap es a keresesi talalatok szurooszlopa
 * kozosen hasznalja. Kulon fajl, hogy a ket lap ugyanazt a sort rajzolja.
 */
/** Ennyi marka latszik alapbol; a tobbi egy natív lenyiloban, JS nelkul. */
export const MARKA_ELSO = 8

export default function MarkaLista({
  sorok,
  aktiv,
  link,
}: {
  sorok: MarkaSor[]
  aktiv: string[]
  link: (id: string) => string
}) {
  const sor = (marka: MarkaSor) => {
    const be = aktiv.includes(marka.id)
    const href = link(marka.id)
    return (
      <li key={marka.id}>
        <a
          href={href}
          rel={szuroLinkRel(href)}
          aria-current={be ? "true" : undefined}
          className={
            "flex items-center justify-between gap-2 text-[14px] leading-[22px] hover:text-acr-ink " +
            (be ? "text-acr-ink" : "text-acr-slate")
          }
        >
          <span className="flex min-w-0 items-center gap-2">
            <span
              className={
                "h-[15px] w-[15px] shrink-0 border " +
                (be
                  ? "border-acr-navy bg-acr-navy"
                  : "border-acr-slate bg-acr-mist")
              }
              aria-hidden="true"
            />
            <span className="min-w-0">{marka.nev}</span>
          </span>
          <span className="shrink-0">{marka.szam}</span>
        </a>
      </li>
    )
  }
  const elso = sorok.slice(0, MARKA_ELSO)
  const tobbi = sorok.slice(MARKA_ELSO)
  return (
    <>
      <ul className="flex flex-col gap-2">{elso.map(sor)}</ul>
      {tobbi.length > 0 ? (
        <details>
          <summary className="cursor-pointer text-[14px] leading-[22px] text-acr-ocean">
            További {tobbi.length} márka
          </summary>
          <ul className="mt-2 flex flex-col gap-2">{tobbi.map(sor)}</ul>
        </details>
      ) : null}
    </>
  )
}
