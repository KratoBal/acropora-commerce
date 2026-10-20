import Konteiner from "@modules/kezdolap/components/konteiner"
import CimLink from "@modules/kezdolap/components/cim-link"
import KepHely from "@modules/kezdolap/components/kep-hely"
import type { Szovegek } from "@modules/kezdolap/szovegek"

const SOROK = [1, 2, 3, 4]

/** A SZOLGALTATASOK SAVJA: egy kep es negy sor (sorszam, nev, leiras, hivatkozas). */
const Szolgaltatasok = ({ s }: { s: Szovegek }) => (
  <section
    data-testid="szolgaltatasok"
    className="py-10"
    style={{ color: "var(--kl-szoveg)" }}
  >
    <Konteiner className="grid gap-10 small:grid-cols-[560px_1fr] small:gap-20">
      <KepHely
        src={s.kep("szolg.kep")}
        alt={s.szoveg("szolg.cim")}
        className="h-full min-h-[320px] w-full"
        testid="szolg-kep"
      />
      <div className="flex flex-col">
        <div
          className="text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--kl-kek)" }}
        >
          {s.szoveg("szolg.felirat")}
        </div>
        <h2
          className="mt-[14px] font-kiemelt text-4xl font-normal leading-[1.1] tracking-[-0.01em] small:text-[40px]"
          style={{ color: "var(--kl-navy)" }}
        >
          {s.szoveg("szolg.cim")}
        </h2>
        <div
          className="mt-7 flex flex-col border-t"
          style={{ borderColor: "var(--kl-keret)" }}
        >
          {SOROK.map((n) => {
            const cim = s.link(`szolg.${n}.link`)
            const felirat = s.szoveg(`szolg.${n}.felirat`)
            return (
              <div
                key={n}
                className="grid grid-cols-[48px_1fr] items-baseline gap-4 border-b py-4 small:grid-cols-[48px_1fr_auto]"
                style={{ borderColor: "var(--kl-keret)" }}
              >
                <span
                  className="text-[14px]"
                  style={{ color: "var(--kl-halvany)" }}
                >
                  {String(n).padStart(2, "0")}
                </span>
                <div>
                  <div
                    className="font-kiemelt text-2xl"
                    style={{ color: "var(--kl-navy)" }}
                  >
                    {s.szoveg(`szolg.${n}.cim`)}
                  </div>
                  <div
                    className="mt-[2px] text-[15px]"
                    style={{ color: "var(--kl-halvany)" }}
                  >
                    {s.szoveg(`szolg.${n}.szoveg`)}
                  </div>
                </div>
                {cim && felirat ? (
                  <CimLink
                    cim={cim}
                    className="col-start-2 text-[15px] font-semibold small:col-start-auto"
                    style={{ color: "var(--kl-kek)" }}
                  >
                    {felirat}
                  </CimLink>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </Konteiner>
  </section>
)

export default Szolgaltatasok
