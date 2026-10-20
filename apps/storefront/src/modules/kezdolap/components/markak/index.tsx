import CimLink from "@modules/kezdolap/components/cim-link"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"

const MARKAK = [1, 2, 3, 4]

/** A MARKASOR: negy szerkesztheto nev es egy "Osszes marka" hivatkozas (ha van celja). */
const Markak = ({ s }: { s: Szovegek }) => {
  const osszes = s.link("markak.osszes.link")
  const osszesFelirat = s.szoveg("markak.osszes.felirat")
  return (
    <section
      data-testid="markak"
      className="flex flex-col gap-6 border-y px-4 py-10 small:flex-row small:items-center small:justify-between small:px-16"
      style={{ borderColor: "var(--kl-keret)" }}
    >
      <span className="text-[14px]" style={{ color: "var(--kl-halvany)" }}>
        {s.szoveg("markak.felirat")}
        {MARKAK.some((n) => s.minta(`markak.${n}`)) ? (
          <span className="ml-3 inline-block">
            <MintaJelzo mit="márkák" />
          </span>
        ) : null}
      </span>
      <div
        className="flex flex-wrap gap-x-[72px] gap-y-3 text-[22px] font-semibold tracking-[0.02em]"
        style={{ color: "var(--kl-halvany)" }}
      >
        {MARKAK.map((n) => {
          const nev = s.szoveg(`markak.${n}`)
          return nev ? <span key={n}>{nev}</span> : null
        })}
      </div>
      {osszes && osszesFelirat ? (
        <CimLink
          cim={osszes}
          className="text-[15px] font-semibold"
          style={{ color: "var(--kl-kek)" }}
        >
          {osszesFelirat}
        </CimLink>
      ) : null}
    </section>
  )
}

export default Markak
