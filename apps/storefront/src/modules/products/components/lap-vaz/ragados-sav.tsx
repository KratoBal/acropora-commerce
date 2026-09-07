import React from "react"

/**
 * A LAP ALJAN FUTO SAV -- A TERV 14. DOBOZA.
 *
 * === MI ALL A TERVBEN, MERVE (2026-09-07, a tervfajlbol, bongeszo nelkul) ===
 *
 * Ket valtozat all benne, es NEM ugyanaz a kettо:
 *
 *   ASZTALI   margin-top:56px; padding:20px 44px; border-top 1px;
 *             hatter oklch(0.205 0.018 249);  NEM ragad
 *             48px bolyegkep + nev + alcim + 20px/700 ar + gomb (0 26px)
 *   MOBIL     margin-top:24px; padding:14px 18px; border-top 1px;
 *             hatter oklch(0.17 0.016 250);   position:sticky; bottom:0
 *             cimke + 16px/600 ar + gomb (0 24px)
 *
 * Mindket gomb: height 50px, rez hatter, SOTET szoveg, 15px/600.
 *
 * ES EGY SAJAT HAMIS NULLA, AMIT KIMONDOK: eloszor a `position:fixed` alakra
 * kerestem, es nem talaltam semmit -- majdnem azt irtam le, hogy a tervben
 * nincs is ragado sav. A terv `position:sticky; bottom:0` alakot hasznal. A
 * nulla a KERDESEM tulajdonsaga volt.
 *
 * === EGY TOKEN, AMIT MAJDNEM KITALALTAM ===
 *
 * Eloszor `var(--terv-hatter-mely, var(--terv-hatter))` allt itt. Az a token
 * NEM LETEZIK -- a var() csendben a tartalekra esett volna, es a sav a lap
 * alapszinet viselte volna a melyebb feluleti szin helyett. Nem hibazik, csak
 * mast mutat.
 *
 * A tervbeli ertek (sotetben oklch(0.17 0.016 250)) MAR MEGVAN, `--terv-hatter-lap`
 * neven, es a szerepe is stimmel: a kartyak lapja, vagyis ami a lap FOLOTT ul.
 *
 * === MIERT PARAMETEREK, ES NEM SAJAT TARTALOM ===
 *
 * A sav harom dolgot mutat: egy CIMKET (keszlet-allapot), az ARAT es egy
 * CSELEKVEST. Mind a harom mar letezik a repoban, es egyiket sem a vaz
 * tulajdonolja:
 *
 *   a keszlet-allapot murena komponense
 *   az ar a valtozat-valasztastol fugg, ami a vasarlasi reszben el
 *   a cselekves ugyanaz a kosarba-tetel, ami a jobb oszlopban all
 *
 * Ha a sav SAJAT arat szamolna, az a pillanat, amikor a lapon KET kulonbozo ar
 * allhat egyszerre -- es a kettо eltevedese NEM hibazna, csak mast mutatna.
 * Ezert a sav a tervbeli ELRENDEZEST adja, a TARTALMAT a hivo.
 */
export type RagadosSavProps = {
  /** Bal oldali kis cimke, pl. a keszlet-allapot. Ha nincs, a helye osszemegy. */
  cimke?: React.ReactNode
  /** Az ar, a hivo formazasaban -- a sav nem szamol arat. */
  ar?: React.ReactNode
  /** A cselekves. A tervben egy gomb all itt, jobbra zarva. */
  cselekves?: React.ReactNode
}

/**
 * A sav akkor all ossze, ha BARMELYIK resze megvan. Ures savot nem rajzolunk:
 * egy ures ragado csik a lap aljan nem "meg nincs kesz", hanem hiba.
 */
export const vanTartalma = (p: RagadosSavProps): boolean =>
  Boolean(p.cimke || p.ar || p.cselekves)

const RagadosSav = ({ cimke, ar, cselekves }: RagadosSavProps) => {
  if (!vanTartalma({ cimke, ar, cselekves })) {
    return null
  }

  return (
    <div
      data-testid="ragados-sav"
      className="sticky bottom-0 flex items-center gap-[10px] border-t px-[18px] py-[14px] lg:gap-5 lg:px-11 lg:py-5"
      style={{
        borderColor: "var(--terv-keret)",
        background: "var(--terv-hatter-lap)",
      }}
    >
      <div className="flex-1">
        {cimke ? (
          <div
            className="text-xs"
            style={{ color: "var(--terv-szoveg-halvany)" }}
            data-testid="ragados-sav-cimke"
          >
            {cimke}
          </div>
        ) : null}
        {ar ? (
          <div
            className="text-base font-semibold lg:text-xl lg:font-bold"
            data-testid="ragados-sav-ar"
          >
            {ar}
          </div>
        ) : null}
      </div>
      {cselekves ? (
        <div data-testid="ragados-sav-cselekves">{cselekves}</div>
      ) : null}
    </div>
  )
}

export default RagadosSav
