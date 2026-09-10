import React from "react"

/**
 * AZ ASZTALI ZAROSOR -- A TERV MASIK ALSO SAVJA.
 *
 * === KET SAV VAN, ES NEM UGYANAZ MERETEZVE ===
 *
 * A tervben KET kulonbozo also elem all, es soha nem egyszerre. A sajat
 * megkulonbozteto jegyukre keresve, mind a harom tervlapon (murena merese,
 * 2026-09-09 es 09-10):
 *
 *                       ASZTALI (1440)        MOBIL (390)
 *     pozicio           static -- NEM ragad   sticky; bottom:0
 *     magassag          91                    79
 *     felso margo       56                    24  (az elvetett 1a lapon 28)
 *     belso margo       20px 44px             14px 18px
 *     szelesseg         1440 = a lap          390 = a lap
 *     tartalom          48x48 belyegkep       cimke
 *                       nev · cikkszam        ar
 *                       keszlet-sor           gomb
 *                       ar
 *                       gomb
 *
 * Ezert KULON komponens, es nem a `RagadosSav` egy szelesebb valtozata: a ket
 * elem tartalma is mas, nem csak a merete. A `RagadosSav` `lg:hidden`, ez
 * `hidden lg:flex` -- egyszerre soha nem latszik ketto.
 *
 * === A MERT ERTEKEK ES A TOKENEK PAROSITASA ===
 *
 * A tervbol merve (computed style, a 2a es az 1b lapon):
 *
 *     hatter        sotet oklch(0.205 0.018 249)   vilagos oklch(0.975 0.006 75)
 *     felso keret   sotet oklch(0.28 0.014 250)    vilagos oklch(0.88 0.008 70)
 *     nev sora      15px / 600, sotet 0.95 0.006 250, vilagos 0.2 0.012 60
 *     keszlet sora  13px / 400, sotet 0.72 0.014 250, vilagos 0.48 0.012 60
 *     ar            20px / 700
 *
 * A tokenjeink ugyanezek, es a legtobb BETUERE egyezik:
 *
 *     --terv-hatter-halvany   soteten 0.205 0.018 249   PONTOS
 *     --terv-keret            soteten 0.28 0.014 250    PONTOS
 *                             vilagosban 0.88 0.008 70  PONTOS
 *     --terv-szoveg           soteten 0.95 0.006 250    PONTOS
 *                             vilagosban 0.2 0.012 60   PONTOS
 *
 * ES KET HELYEN NEM PONTOS, EZERT KIIROM:
 *
 *     a hatter VILAGOSBAN: a terv 0.975, a tokenunk 0.965 -- egy szazad
 *       vilagossag. Uj tokent nem veszek fel ra: a lapunk szabalya szerint egy
 *       ilyen kulonbseg a ZAJT emelne szerepre. A `--terv-doboz-hatter` NEM
 *       jo ide, mert az a vilagos vilagban `transparent`.
 *     a keszlet-sor szine: a terv 0.72 0.014 / 0.48 0.012, a tokenunk
 *       0.72 0.012 / 0.5 0.012. Ugyanaz a szerep, ezred/szazad elteres.
 *
 * === AMI NINCS ITT, ES MIERT ===
 *
 * A terv masodik sora a 2a lapon "Utolsó darab · szállítás szerdán". A
 * SZALLITASI mondat nem a termek adata: a fejlec bizalmi savja allitja, a
 * lap egeszere. Ide masolni azt jelentene, hogy egy ALTALANOS igeretet
 * termek-szintu allitaskent mutatunk. A keszlet-allapot viszont a termek
 * sajatja, es azt a hivo adja at.
 */
export type ZaroSorProps = {
  /** A belyegkep forrasa. Ha nincs, a helye URES marad, nem tunik el. */
  kepUrl?: string | null
  /** A nev sora: a termek neve es a cikkszama, a hivo osszeallitasaban. */
  nev?: React.ReactNode
  /**
   * A MASODIK SOR: KESZLET-ALLAPOT. MA NINCS FORRASA, EZERT A HIVO NEM ADJA AT.
   *
   * === MILYEN FORRASRA VAR, ES MI NEM AZ ===
   *
   * Amire var: a peldany KESZLET-ALLAPOTA, mondatba ontve ("Utolso darab",
   * "Raktaron 3 db"). Ilyen adatunk ma nincs -- merve 2026-09-07: a bolt MINDEN
   * termeke nulla keszleten all, tehat a nulla nem meres, hanem az atvitel
   * hianya. Amig ez igy all, a helyes ertek az URES sor, nem egy hiheto mondat.
   *
   * AMI NEM AZ: az `availabilityLabel` terkep. A neve es a kulcsai
   * (`KAPHATO`, `ELFOGYOTT`) allapot-fogalmat igernek, az ERTEKEI viszont
   * KEVERTEK: az `ELFOGYOTT` erteke allapot-allitas, a `KAPHATO` erteke
   * viszont GOMBFELIRAT ("Kosárba").
   *
   * === MIERT ALL EZ ITT, ES NEM CSAK A HIVONAL ===
   *
   * A #342-ben pontosan ugy keletkezett a hiba, hogy valaki keresett egy
   * terkepet, ami feliratokat ad allapotokhoz, es talalt egyet: a nev
   * stimmelt, a jelentes nem. A kaphato termek lapjan ezutan a halvany 13px-es
   * sor es a mellette allo gomb ugyanazt a szot mondta (merve a kiszolgalt
   * lapon, 2026-09-10). Nem hibazott es nem hasalt el: ket helyen allt ugyanaz.
   *
   * Egy uresen allo prop, ami mellett nincs odairva, MIT var, ugyanezt fogja
   * megismetelni. A hivo oldalan all a mai dontes; itt az all, mi tenne
   * ervenyesse.
   */
  cimke?: React.ReactNode
  /** Az ar, a hivo formazasaban -- a sor nem szamol arat. */
  ar?: React.ReactNode
  /** A cselekves. A tervben egy gomb all itt, jobbra zarva. */
  cselekves?: React.ReactNode
}

export const vanTartalma = (p: ZaroSorProps): boolean =>
  Boolean(p.nev || p.cimke || p.ar || p.cselekves)

const ZaroSor = ({ kepUrl, nev, cimke, ar, cselekves }: ZaroSorProps) => {
  if (!vanTartalma({ kepUrl, nev, cimke, ar, cselekves })) {
    return null
  }

  return (
    <div
      data-testid="zarosor"
      className="hidden items-center gap-5 border-t bg-[var(--terv-hatter-halvany)] px-11 py-5 lg:flex"
      style={{ borderColor: "var(--terv-keret)" }}
    >
      {/*
        A BELYEGKEP HELYE AKKOR IS MEGVAN, HA NINCS KEP.
        A tervben 48x48, lekerekites nelkul. Ha a termeknek nincs kepe, egy
        ures felulet all ott -- igy a sor geometriaja nem ugrik meg
        termekenkent.
      */}
      <div
        className="h-12 w-12 shrink-0 overflow-hidden"
        style={{ background: "var(--terv-hatter-lap)" }}
        data-testid="zarosor-belyeg"
      >
        {kepUrl ? (
          <img
            src={kepUrl}
            alt=""
            className="h-full w-full object-cover"
            data-testid="zarosor-belyeg-kep"
          />
        ) : null}
      </div>
      <div className="min-w-0 flex-1">
        {nev ? (
          <div
            className="truncate text-[15px] font-semibold"
            style={{ color: "var(--terv-szoveg)" }}
            data-testid="zarosor-nev"
          >
            {nev}
          </div>
        ) : null}
        {cimke ? (
          <div
            className="truncate text-[13px]"
            style={{ color: "var(--terv-szoveg-halvany)" }}
            data-testid="zarosor-cimke"
          >
            {cimke}
          </div>
        ) : null}
      </div>
      {ar ? (
        <div className="shrink-0 text-xl font-bold" data-testid="zarosor-ar">
          {ar}
        </div>
      ) : null}
      {cselekves ? (
        <div className="shrink-0" data-testid="zarosor-cselekves">
          {cselekves}
        </div>
      ) : null}
    </div>
  )
}

export default ZaroSor
