import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import SavFejlec from "@modules/kezdolap/components/sav-fejlec"
import { MINTA_CIKKEK, MINTA_VIDEO } from "@modules/kezdolap/minta-adat"

/**
 * A MAGAZIN ES A VIDEO SAV -- EGY RACSBAN, AHOGY A TERVEN IS.
 *
 * === MIERT MINTA MIND A KETTO ===
 *
 * Magazin: a boltnak ma NINCS cikkforrasa. A tartalom-vazlatok az Acropora OS
 * Tartalom menujeben allnak, a kirakat nem olvassa oket, es a Medusa oldalan
 * sincs cikk-tipus. Ez nem hianyzo komponens, hanem hianyzo forras.
 *
 * Video: a YouTube csatorna LETEZIK, tehat ez a sav all a legkozelebb az
 * eleshez -- egyetlen dontes hianyzik hozza, hogy MELYIK video alljon a
 * kezdolapon. Amig nincs, a beagyazas helye all itt, es nem egy talalomra
 * kivalasztott felvetel.
 *
 * === AMIT A HELYORZO NEM CSINAL ===
 *
 * Nem tolt be YouTube-beagyazast. Egy ures beagyazas is meghivja a kulso
 * szolgaltatot, sutiket allit, es a latogato adatai elmennek egy videoert,
 * ami nincs is kivalasztva.
 */
const MagazinEsVideo = () => {
  const kiemelt = MINTA_CIKKEK.find((c) => c.kiemelt) ?? MINTA_CIKKEK[0]
  const tobbi = MINTA_CIKKEK.filter((c) => c !== kiemelt)

  return (
    <section className="content-container py-12" data-testid="magazin-es-video">
      <div className="grid gap-10 medium:grid-cols-[1.5fr_1fr]">
        <div>
          <SavFejlec
            eyebrow="Magazin"
            cim="Amit a boltban is elmondanánk"
            jobbraSzoveg="Összes cikk"
            jobbraCim="/store"
            jelzo={<MintaJelzo mit="nincs cikkforrás" />}
          />

          <article
            className="grid gap-4 border p-4 small:grid-cols-[200px_1fr]"
            style={{
              borderColor: "var(--terv-keret)",
              background: "var(--terv-hatter-lap)",
            }}
          >
            <div
              aria-hidden="true"
              className="aspect-[4/3] w-full"
              style={{ background: "var(--terv-hatter-halvany)" }}
            />
            <div>
              <p
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: "var(--terv-kiemel-tinta)" }}
              >
                {kiemelt.rovat}
              </p>
              <h3
                className="mt-2 text-lg font-semibold leading-snug"
                style={{ color: "var(--terv-szoveg)" }}
              >
                {kiemelt.cim}
              </h3>
              {kiemelt.bevezeto ? (
                <p
                  className="mt-2 text-sm leading-relaxed"
                  style={{ color: "var(--terv-szoveg-halvany)" }}
                >
                  {kiemelt.bevezeto}
                </p>
              ) : null}
              <p
                className="mt-3 text-xs"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {kiemelt.datum}
              </p>
            </div>
          </article>

          <ul className="mt-4 grid gap-4 small:grid-cols-2">
            {tobbi.map((cikk) => (
              <li
                key={cikk.cim}
                className="border p-4"
                style={{
                  borderColor: "var(--terv-keret)",
                  background: "var(--terv-hatter-lap)",
                }}
              >
                <div
                  aria-hidden="true"
                  className="mb-3 aspect-[16/9] w-full"
                  style={{ background: "var(--terv-hatter-halvany)" }}
                />
                <p
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--terv-kiemel-tinta)" }}
                >
                  {cikk.rovat}
                </p>
                <h3
                  className="mt-2 font-semibold leading-snug"
                  style={{ color: "var(--terv-szoveg)" }}
                >
                  {cikk.cim}
                </h3>
                <p
                  className="mt-2 text-xs"
                  style={{ color: "var(--terv-szoveg-halvany)" }}
                >
                  {cikk.datum}
                </p>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <SavFejlec
            eyebrow="Videó"
            cim="A telepről"
            jelzo={<MintaJelzo mit="nincs kiválasztott videó" />}
          />

          <div
            className="border"
            style={{
              borderColor: "var(--terv-keret)",
              background: "var(--terv-hatter-sotet)",
            }}
          >
            <div
              className="relative flex aspect-video w-full items-center justify-center"
              aria-hidden="true"
            >
              <span
                className="flex h-12 w-12 items-center justify-center"
                style={{
                  background: "var(--terv-kiemel)",
                  color: "var(--terv-kiemel-szoveg)",
                }}
              >
                ▶
              </span>
            </div>
            <div className="p-4">
              <h3
                className="font-semibold leading-snug"
                style={{ color: "var(--terv-szoveg-vilagos)" }}
              >
                {MINTA_VIDEO.cim}
              </h3>
              <p
                className="mt-2 text-sm leading-relaxed"
                style={{ color: "var(--terv-szoveg-vilagos)", opacity: 0.75 }}
              >
                {MINTA_VIDEO.szoveg}
              </p>
              <ul className="mt-4 flex flex-col gap-2">
                {MINTA_VIDEO.fejezetek.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-3 border p-2 text-sm"
                    style={{
                      borderColor: "var(--terv-keret)",
                      color: "var(--terv-szoveg-vilagos)",
                    }}
                  >
                    <span
                      aria-hidden="true"
                      className="h-10 w-16 shrink-0"
                      style={{ background: "var(--terv-hatter-halvany)" }}
                    />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default MagazinEsVideo
