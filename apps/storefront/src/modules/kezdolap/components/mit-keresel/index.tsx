import CimLink from "@modules/kezdolap/components/cim-link"
import KepHely from "@modules/kezdolap/components/kep-hely"
import type { Szovegek } from "@modules/kezdolap/szovegek"

const TERULETEK = [1, 2, 3, 4]
const HIVATKOZASOK = [1, 2, 3, 4, 5]

/**
 * A "MIT KERESEL MA?" SAV: negy terulet, mindegyik egy kep, egy nev es legfeljebb
 * ot hivatkozas. Minden szoveg, kep es cel szerkesztheto; egy hivatkozas csak
 * akkor jelenik meg, ha van felirata ES celja (a halott link rosszabb a
 * hianyzonal). A terulet-sorszam (01-04) a pozicio, nem szoveg.
 */
const MitKeresel = ({ s }: { s: Szovegek }) => (
  <section
    data-testid="mit-keresel"
    className="px-4 py-10 small:px-16"
    style={{ color: "var(--kl-szoveg)" }}
  >
    <div className="mb-12 flex flex-col gap-4 small:flex-row small:items-end small:justify-between">
      <h2
        className="font-kiemelt text-4xl font-normal leading-[1.1] tracking-[-0.01em] small:text-[46px]"
        style={{ color: "var(--kl-navy)" }}
      >
        {s.szoveg("mit.cim")}
      </h2>
      <p className="max-w-[420px] text-base" style={{ color: "var(--kl-halvany)" }}>
        {s.szoveg("mit.alcim")}
      </p>
    </div>
    <div className="grid gap-6 small:grid-cols-4">
      {TERULETEK.map((n) => (
        <div key={n} className="flex flex-col gap-5">
          <KepHely
            src={s.kep(`mit.${n}.kep`)}
            alt={s.szoveg(`mit.${n}.cim`)}
            className="h-[380px] w-full"
            testid={`mit-kep-${n}`}
          />
          <div className="flex items-baseline justify-between">
            <h3
              className="font-kiemelt text-[30px] font-normal"
              style={{ color: "var(--kl-navy)" }}
            >
              {s.szoveg(`mit.${n}.cim`)}
            </h3>
            <span className="text-[13px]" style={{ color: "var(--kl-halvany)" }}>
              {String(n).padStart(2, "0")}
            </span>
          </div>
          <div
            className="flex flex-col gap-2 border-t pt-4 text-[15px]"
            style={{ borderColor: "var(--kl-keret)" }}
          >
            {HIVATKOZASOK.map((l) => {
              const felirat = s.szoveg(`mit.${n}.l${l}.felirat`)
              const cim = s.link(`mit.${n}.l${l}.link`)
              if (!felirat || !cim) return null
              return (
                <CimLink
                  key={l}
                  cim={cim}
                  style={{ color: "var(--kl-kek)" }}
                >
                  {felirat}
                </CimLink>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  </section>
)

export default MitKeresel
