import RovidSzoveg from "@modules/kezdolap/components/rovid-szoveg"
import CimLink from "@modules/kezdolap/components/cim-link"
import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import type { Szovegek } from "@modules/kezdolap/szovegek"

const LEPESEK = [1, 2, 3]
const SOROK = [1, 2, 3, 4]

/**
 * A KET PANEL EGYMAS MELLETT: kezdoknek (vilagoskek, harom lepes, ket gomb) es
 * tapasztaltaknak (sotet, negy sor, egy gomb). Minden szoveg es cel szerkesztheto;
 * a gomb, illetve a sor csak felirattal es celral egyutt jelenik meg.
 */
const KezdoEsHalado = ({ s }: { s: Szovegek }) => {
  const kezdoGomb1 = s.link("kezdo.gomb1.link")
  const kezdoGomb2 = s.link("kezdo.gomb2.link")
  const haladoGomb = s.link("halado.gomb.link")
  return (
    <section data-testid="kezdo-es-halado" className="grid small:grid-cols-2">
      <div
        className="flex flex-col gap-7 px-4 py-10 small:pl-[max(4rem,calc((100vw_-_1440px)/2_+_4rem))] small:pr-16"
        style={{ background: "#DCE7EF", color: "var(--kl-szoveg)" }}
      >
        <div
          className="text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "var(--kl-kek)" }}
        >
          {s.szoveg("kezdo.felirat")}
        </div>
        <h2
          className="font-kiemelt text-4xl font-normal leading-[1.08] small:text-[44px]"
          style={{ color: "var(--kl-navy)" }}
        >
          {s.szoveg("kezdo.cim")}
        </h2>
        <RovidSzoveg
          className="max-w-[520px] text-[17px]"
          style={{ color: "var(--kl-halvany)" }}
          ertek={s.rovid("kezdo.szoveg")}
        />
        <div className="grid gap-4 small:grid-cols-3">
          {LEPESEK.map((n) => (
            <div
              key={n}
              className="rounded p-[18px]"
              style={{ background: "var(--kl-lap)" }}
            >
              <div
                className="text-[13px] font-semibold"
                style={{ color: "var(--kl-kek)" }}
              >
                {s.szoveg(`kezdo.${n}.lepes`)}
              </div>
              <div className="mt-1 font-semibold">
                {s.szoveg(`kezdo.${n}.cim`)}
              </div>
              <RovidSzoveg
                className="text-[14px]"
                style={{ color: "var(--kl-halvany)" }}
                ertek={s.rovid(`kezdo.${n}.szoveg`)}
              />
            </div>
          ))}
        </div>
        <div className="mt-auto flex flex-wrap gap-[14px]">
          {kezdoGomb1 && s.szoveg("kezdo.gomb1.felirat") ? (
            <CimLink
              cim={kezdoGomb1}
              className="rounded-[28px] px-6 py-[15px] text-[15px] font-semibold"
              style={{ background: "var(--kl-navy)", color: "var(--kl-lap)" }}
            >
              {s.szoveg("kezdo.gomb1.felirat")}
            </CimLink>
          ) : null}
          {kezdoGomb2 && s.szoveg("kezdo.gomb2.felirat") ? (
            <CimLink
              cim={kezdoGomb2}
              className="rounded-[28px] border px-6 py-[14px] text-[15px] font-semibold"
              style={{ borderColor: "var(--kl-navy)", color: "var(--kl-navy)" }}
            >
              {s.szoveg("kezdo.gomb2.felirat")}
            </CimLink>
          ) : null}
        </div>
      </div>

      <div
        className="flex flex-col gap-7 px-4 py-10 small:pl-16 small:pr-[max(4rem,calc((100vw_-_1440px)/2_+_4rem))]"
        style={{ background: "var(--kl-navy)", color: "var(--kl-lap)" }}
      >
        <div
          className="text-[13px] font-semibold uppercase tracking-[0.14em]"
          style={{ color: "#DCE7EF" }}
        >
          {s.szoveg("halado.felirat")}
        </div>
        <h2 className="font-kiemelt text-4xl font-normal leading-[1.08] small:text-[44px]">
          {s.szoveg("halado.cim")}
        </h2>
        <div
          className="flex flex-col border-t"
          style={{ borderColor: "#29425C" }}
        >
          {SOROK.map((n) => {
            const cim = s.link(`halado.${n}.link`)
            const felirat = s.szoveg(`halado.${n}.cim`)
            if (!cim || !felirat) return null
            return (
              <CimLink
                key={n}
                cim={cim}
                className="flex flex-col justify-between gap-1 border-b py-3 small:flex-row"
                style={{ borderColor: "#29425C", color: "var(--kl-lap)" }}
              >
                <span className="font-semibold">{felirat}</span>
                <span style={{ color: "#DCE7EF" }}>
                  {s.szoveg(`halado.${n}.szoveg`)}
                  {s.minta(`halado.${n}.szoveg`) ? (
                    <span className="ml-2 inline-block">
                      <MintaJelzo mit="eredet" />
                    </span>
                  ) : null}
                </span>
              </CimLink>
            )
          })}
        </div>
        {haladoGomb && s.szoveg("halado.gomb.felirat") ? (
          <CimLink
            cim={haladoGomb}
            className="mt-auto self-start rounded-[28px] px-6 py-[15px] text-[15px] font-semibold"
            style={{ background: "var(--kl-lap)", color: "var(--kl-navy)" }}
          >
            {s.szoveg("halado.gomb.felirat")}
          </CimLink>
        ) : null}
      </div>
    </section>
  )
}

export default KezdoEsHalado
