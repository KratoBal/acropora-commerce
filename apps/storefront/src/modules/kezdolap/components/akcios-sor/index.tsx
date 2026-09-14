import MintaJelzo from "@modules/kezdolap/components/minta-jelzo"
import SavFejlec from "@modules/kezdolap/components/sav-fejlec"
import Visszaszamlalo from "@modules/kezdolap/components/akcios-sor/visszaszamlalo"
import {
  MINTA_AKCIOK,
  MINTA_AKCIO_HATRALEVO_ORA,
} from "@modules/kezdolap/minta-adat"

/**
 * AZ AKCIOS SOR -- TELJES EGESZEBEN MINTA, ES EZ MERESEN ALL.
 *
 * Merve 2026-09-14 a teszt bolton, a magyar regioval kerdezve: 1494 termek,
 * 1490 valtozat hordoz arat, es EGYETLEN EGYEN SINCS kedvezmenyes ar (sehol
 * nem ter el az `original_amount` a `calculated_amount` ertektol).
 *
 * Vagyis ez a sav ma NEM tolthato fel valodi adatbol: nem azert, mert nem
 * talaltam meg a forrast, hanem mert a bolt jelenleg nem tart akciot.
 *
 * === AMIERT A TETELEK NEM VALODI TERMEKEK ===
 *
 * Kezenfekvo lett volna negy igazi termeket kivenni a katalogusbol, es rajuk
 * irni a tervbeli szazalekokat. Azt szandekosan nem tettem: egy valodi
 * terméknev melle irt kitalalt "-30%" kepernyokepen mar ajanlatnak latszik, es
 * a jelzo nem utazik vele. A tetelek ezert a TERVLAP sajat demo-termekei.
 *
 * === MI VALTOZIK, AMIKOR LESZ AKCIO ===
 *
 * A `MINTA_AKCIOK` helyere egy termek-lekerdezes kerul, ami az
 * `original_amount > calculated_amount` felteteltre szur, es a `MintaJelzo`
 * lekerul a savrol. A sav alakja nem valtozik.
 */
const AkciosSor = () => {
  return (
    <section
      className="content-container py-12"
      data-testid="akcios-sor"
      style={{ borderTopColor: "var(--terv-keret)" }}
    >
      <SavFejlec
        eyebrow="Akciós termékek"
        cim="Most kedvezményes"
        jobbraSzoveg="Minden akció"
        jobbraCim="/store"
        jelzo={<MintaJelzo mit="a boltban ma nincs kedvezményes ár" />}
      />

      <div className="mb-4">
        <Visszaszamlalo hatralevoOra={MINTA_AKCIO_HATRALEVO_ORA} />
      </div>

      <ul className="grid grid-cols-2 gap-4 medium:grid-cols-4">
        {MINTA_AKCIOK.map((tetel) => (
          <li
            key={tetel.cikkszam}
            className="flex flex-col border"
            style={{
              borderColor: "var(--terv-keret)",
              background: "var(--terv-hatter-lap)",
            }}
          >
            <div className="relative">
              {/*
                A KEP HELYE. Negyzet, ugyanaz az arany, mint a terméklista
                kartyain (2026-09-14, PR 367) -- igy a ket lap kepei egyforma
                alakuak maradnak.
              */}
              <div
                aria-hidden="true"
                className="aspect-square w-full"
                style={{ background: "var(--terv-hatter-halvany)" }}
              />
              <span
                className="absolute left-0 top-0 px-2 py-1 text-[11px] font-semibold"
                style={{
                  background: "var(--terv-kiemel)",
                  color: "var(--terv-kiemel-szoveg)",
                }}
              >
                {tetel.kedvezmeny}
              </span>
            </div>

            <div className="flex flex-1 flex-col gap-1 p-3">
              <span
                className="text-[11px] uppercase tracking-wide"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {tetel.marka} · {tetel.cikkszam}
              </span>
              <span
                className="font-semibold leading-snug"
                style={{ color: "var(--terv-szoveg)" }}
              >
                {tetel.nev}
              </span>
              <span className="mt-1 flex flex-wrap items-baseline gap-2">
                <span
                  className="text-lg font-semibold"
                  style={{ color: "var(--terv-szoveg)" }}
                >
                  {tetel.ar}
                </span>
                <span
                  className="text-sm line-through"
                  style={{ color: "var(--terv-szoveg-halvany)" }}
                >
                  {tetel.regiAr}
                </span>
              </span>
              <span
                className="mt-1 text-xs"
                style={{ color: "var(--terv-szoveg-halvany)" }}
              >
                {tetel.allapot}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default AkciosSor
