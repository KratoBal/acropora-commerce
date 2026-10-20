import Konteiner from "@modules/kezdolap/components/konteiner"
import CimLink from "@modules/kezdolap/components/cim-link"
import KepHely from "@modules/kezdolap/components/kep-hely"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"

/**
 * A BOLTUNK SAV: a bolt cime, nyitvatartasa es a terkep-gomb. A cim es a
 * nyitvatartas tobb soros szoveg (a sortores megmarad), es Balazs tolti ki: a
 * kezdoertek a terv kitalalt adata.
 */
const Boltunk = ({ s }: { s: Szovegek }) => {
  const gomb = s.link("bolt.gomb.link")
  const gombFelirat = s.szoveg("bolt.gomb.felirat")
  const mintaCimAdat = s.minta("bolt.cim_ertek") || s.minta("bolt.nyitva_ertek")
  return (
    <section data-testid="boltunk" className="pb-20 pt-10">
      <Konteiner>
        <div
          className="grid overflow-hidden rounded-md small:min-h-[520px] small:grid-cols-2"
          style={{ background: "var(--kl-navy)", color: "var(--kl-lap)" }}
        >
          <div className="flex flex-col justify-between gap-10 px-6 py-12 small:px-16 small:py-[72px]">
            <div>
              <div
                className="text-[13px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: "#DCE7EF" }}
              >
                {s.szoveg("bolt.felirat")}
              </div>
              <h2 className="mt-5 font-kiemelt text-4xl font-normal leading-[1.06] small:text-[52px]">
                {s.szoveg("bolt.cim")}
              </h2>
              <p
                className="mt-5 max-w-[460px] text-[17px]"
                style={{ color: "#DCE7EF" }}
              >
                {s.szoveg("bolt.szoveg")}
              </p>
            </div>
            {mintaCimAdat ? (
              <div>
                <MintaJelzo mit="cím és nyitvatartás" />
              </div>
            ) : null}
            <div
              className="grid gap-8 border-t pt-7 text-[15px] small:grid-cols-2"
              style={{ borderColor: "#29425C" }}
            >
              <div>
                <div className="text-[13px]" style={{ color: "#DCE7EF" }}>
                  {s.szoveg("bolt.cim_felirat")}
                </div>
                <div className="mt-[6px] whitespace-pre-line">
                  {s.szoveg("bolt.cim_ertek")}
                </div>
              </div>
              <div>
                <div className="text-[13px]" style={{ color: "#DCE7EF" }}>
                  {s.szoveg("bolt.nyitva_felirat")}
                </div>
                <div className="mt-[6px] whitespace-pre-line">
                  {s.szoveg("bolt.nyitva_ertek")}
                </div>
              </div>
            </div>
            {gomb && gombFelirat ? (
              <CimLink
                cim={gomb}
                className="self-start rounded-[28px] px-6 py-[15px] text-[15px] font-semibold"
                style={{
                  background: "var(--kl-narancs)",
                  color: "var(--kl-navy)",
                }}
              >
                {gombFelirat}
              </CimLink>
            ) : null}
          </div>
          <KepHely
            src={s.kep("bolt.kep")}
            alt={s.szoveg("bolt.cim")}
            className="h-full min-h-[320px] w-full !rounded-none"
            testid="bolt-kep"
          />
        </div>
      </Konteiner>
    </section>
  )
}

export default Boltunk
