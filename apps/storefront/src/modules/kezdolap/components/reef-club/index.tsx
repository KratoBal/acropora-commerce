import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import { MINTA_REEF_CLUB } from "@modules/kezdolap/minta-adat"

/**
 * A REEF CLUB SAV.
 *
 * === MIERT MINTA, ES MIERT NEM CSAK A SZOVEG MIATT ===
 *
 * A sav ket dolgot igér: pontgyujtest es egy feliratkozo listat. MA egyik sem
 * letezik -- se pont-nyilvantartas, se lista, amire fel lehetne iratkozni. Ez
 * nem hianyzo kod, hanem meg meg nem hozott uzleti dontes.
 *
 * === AZ URLAP SZANDEKOSAN TILTOTT ===
 *
 * Egy mukodonek latszo, de nemaba futo urlap ROSSZABB a hianyzo urlapnal: a
 * vevo azt hiszi, feliratkozott, es varni fog egy levelre, ami soha nem jon.
 * Ezert a mezo es a gomb `disabled`, es a gomb alatt kimondjuk, miert.
 *
 * A tervbeli "Eddig 428 vasarlonak van fenn a listan" mondat EZERT NEM keril
 * ki a lapra vevo-szamkent: nulla feliratkozo van. A helyen az all, hogy a
 * lista meg nem indult.
 */
const ReefClub = () => {
  const k = MINTA_REEF_CLUB

  return (
    <section
      data-testid="reef-club"
      style={{ background: "var(--terv-hatter-sotet)" }}
    >
      <div className="content-container py-14">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: "var(--terv-kiemel)" }}
          >
            {k.eyebrow}
          </p>
          <MintaJelzo mit="a klub még nem indult" />
        </div>

        <div className="grid gap-10 medium:grid-cols-[1.4fr_1fr]">
          <div>
            <h2
              className="text-2xl font-semibold leading-tight small:text-3xl"
              style={{ color: "var(--terv-szoveg-vilagos)" }}
            >
              {k.cim}
            </h2>
            <p
              className="mt-4 max-w-2xl text-base leading-relaxed"
              style={{ color: "var(--terv-szoveg-vilagos)", opacity: 0.85 }}
            >
              {k.szoveg}
            </p>

            <ul className="mt-8 grid gap-6 small:grid-cols-3">
              {k.pontok.map((p, i) => (
                <li key={p.cim}>
                  <span
                    className="text-[11px] font-semibold tabular-nums"
                    style={{ color: "var(--terv-kiemel)" }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <p
                    className="mt-1 font-semibold"
                    style={{ color: "var(--terv-szoveg-vilagos)" }}
                  >
                    {p.cim}
                  </p>
                  <p
                    className="mt-1 text-sm leading-relaxed"
                    style={{
                      color: "var(--terv-szoveg-vilagos)",
                      opacity: 0.75,
                    }}
                  >
                    {p.szoveg}
                  </p>
                </li>
              ))}
            </ul>
          </div>

          <div
            className="border p-5"
            style={{
              borderColor: "var(--terv-kiemel)",
              background: "var(--terv-hatter-sotet)",
            }}
          >
            <p
              className="font-semibold"
              style={{ color: "var(--terv-szoveg-vilagos)" }}
            >
              {k.urlapCim}
            </p>
            <p
              className="mt-2 text-sm leading-relaxed"
              style={{ color: "var(--terv-szoveg-vilagos)", opacity: 0.75 }}
            >
              {k.urlapSzoveg}
            </p>

            <input
              type="email"
              disabled
              placeholder="nev@example.hu"
              aria-label="E-mail cím"
              className="mt-4 h-11 w-full border px-3 text-sm"
              style={{
                borderColor: "var(--terv-keret)",
                background: "var(--terv-hatter-sotet)",
                color: "var(--terv-szoveg-vilagos)",
              }}
            />
            <button
              type="button"
              disabled
              className="mt-3 h-11 w-full text-sm font-semibold opacity-60"
              style={{
                background: "var(--terv-kiemel)",
                color: "var(--terv-kiemel-szoveg)",
              }}
            >
              {k.gomb}
            </button>
            <p
              className="mt-3 text-xs"
              style={{ color: "var(--terv-szoveg-vilagos)", opacity: 0.7 }}
            >
              A lista még nem indult el, ezért a mező most nem küld sehova.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export default ReefClub
