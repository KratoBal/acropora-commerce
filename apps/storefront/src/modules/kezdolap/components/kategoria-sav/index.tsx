import LocalizedClientLink from "@modules/common/components/localized-client-link"
import SavFejlec from "@modules/kezdolap/components/sav-fejlec"
import { listNonEmptyRootCategories } from "@lib/data/categories"

/**
 * A KATEGORIA-SAV -- A KEZDOLAP EGYETLEN TELJESEN ELO SAVJA.
 *
 * === MIERT NEM MINTA-ADAT ===
 *
 * Merve 2026-09-14: 219 kategoria all a teszt boltban, a gyokerek termekszama
 * pedig ugyanabbol a lekerdezesbol jon, amit a fejlec-menu amugy is kikuld.
 * Vagyis ennek a savnak VAN forrasa, tehat nem helykitolto.
 *
 * === A NEVEK: A SZULO NEM KERUL A CSEMPERE ===
 *
 * A kategoriaink NEVEBEN benne all a szulo ("Vízkezelés - Termékek"), mert az
 * atkoltozes igy hozta at oket. A terven egyetlen szo all a csempe alatt
 * ("Korallok"). A roviditest NEM itt vegezzuk el: a `megjelenitendoNevek` mar
 * megoldja, es a fejlec is azt hasznalja -- csak akkor rovidit, ha a rovid nev
 * EGYEDI marad a katalogusban.
 *
 * === A VALOGATAS: A BOLT `rank` MEZOJE DONT, NEM EGY BEEGETETT LISTA ===
 *
 * A terv OT csempet mutat, es kettot osszevon ("Halak, gerinctelenek",
 * "Szűrés, áramlás"). Az osszevonas MA nem epitheto meg becsuletesen: egy
 * csempe egy helyre visz, es a ketto kozul barmelyiket valasztjuk, a felirat
 * masik fele hazudna. Ezert a sav a bolt sajat gyokereit mutatja, a bolt sajat
 * sorrendjeben. A vegleges menu-valogatas Balazs nyitott dontese (kartya
 * 659272df); amikor megvan, ez a komponens kap egy listat, es nem valtozik mas.
 */
const KategoriaSav = async ({ regionId }: { regionId: string }) => {
  const { gyokerek, nevek, szamok } = await listNonEmptyRootCategories(regionId)

  if (!gyokerek.length) {
    return null
  }

  return (
    <section className="content-container py-12" data-testid="kategoria-sav">
      <SavFejlec
        eyebrow="Kategóriák"
        cim="Ahol a legtöbben elkezdik"
        jobbraSzoveg="Összes kategória"
        jobbraCim="/store"
      />

      <ul className="grid grid-cols-2 gap-4 medium:grid-cols-5">
        {gyokerek.map((gy) => {
          const darab = szamok.get(gy.id) ?? 0

          return (
            <li key={gy.id}>
              <LocalizedClientLink
                href={`/categories/${gy.handle}`}
                data-testid="kategoria-csempe"
                className="flex h-full flex-col border transition-colors hover:border-[var(--terv-kiemel)]"
                style={{
                  borderColor: "var(--terv-keret)",
                  background: "var(--terv-hatter-lap)",
                }}
              >
                {/*
                  A KEP HELYE. A terven minden csempen fotó all; nekunk ma nincs
                  kategoria-fotonk. Egy kitalalt kep helyett a helye all itt,
                  ugyanabban az aranyban, hogy a sav magassaga ne ugorjon, amikor
                  a fotok megjonnek.
                */}
                <div
                  aria-hidden="true"
                  className="aspect-[4/3] w-full"
                  style={{ background: "var(--terv-hatter-halvany)" }}
                />
                <div className="flex flex-1 flex-col justify-between gap-1 p-3">
                  <span
                    className="font-semibold leading-snug"
                    style={{ color: "var(--terv-szoveg)" }}
                  >
                    {nevek.get(gy.id) ?? gy.name}
                  </span>
                  <span
                    className="text-xs uppercase tracking-wide"
                    style={{ color: "var(--terv-szoveg-halvany)" }}
                  >
                    {darab} termék
                  </span>
                </div>
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

export default KategoriaSav
