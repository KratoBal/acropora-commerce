import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SHIPPING_OPTION_ROLE_BINDINGS } from "../../workflows/utils/shipping-option-roles";
import { SEED_SETTINGS } from "../initial-data-seed";

/**
 * A SEED HET TETELE, ALLITASBA TEVE.
 *
 * MIERT KELLETT: a seed atirasa utan EGYETLEN allitas sem szolt rola. Egy
 * elirt nev, egy kiesett szallitasi mod vagy egy elveszett fizetesi szolgaltato
 * ugyanugy leforditodott volna, es a hiba az elso eles futasnal derult volna ki
 * -- vagyis ott, ahol a legdragabb.
 *
 * AZ ELVARAS ITT KULON LE VAN IRVA, NEM A SEEDBOL SZAMOLVA. Ha innen hivatkoznek
 * ra, az allitas azt mondana, hogy a konstans egyenlo onmagaval, es barmilyen
 * valtoztatas utan zold maradna. Az ertekek acrobot 2026-09-02 08:15 koruli
 * meresebol valok, a teszt gepen, kozvetlen olvaso SQL-lel.
 *
 * AMI SZANDEKOSAN NINCS ITT: a hetedik tetel, a szallitas-fizetes parositasok.
 * Az nem ERTEK, hanem DONTES, es a seed ma nem ir a `shipping_payment_rule`
 * tablaba. Egy allitas arrol, hogy "nem ir", ures vilagon is igaz lenne, tehat
 * nem irok ilyet; a dontes indoka a seed fejlecében all.
 */
describe("a seed hét mért tétele", () => {
  it("a régió Hungary, forintban", () => {
    expect(SEED_SETTINGS.regio.nev).toBe("Hungary");
    expect(SEED_SETTINGS.regio.penznem).toBe("huf");
  });

  it("az adó 27 százalék, Áfa néven, magyar adóterületen", () => {
    expect(SEED_SETTINGS.ado.orszag).toBe("hu");
    expect(SEED_SETTINGS.ado.kulcsNeve).toBe("Áfa");
    expect(SEED_SETTINGS.ado.szazalek).toBe(27);
  });

  it("az értékesítési csatorna az Acropora Webshop", () => {
    expect(SEED_SETTINGS.csatorna).toBe("Acropora Webshop");
  });

  it("a raktár az Acropora Budapest", () => {
    expect(SEED_SETTINGS.raktar).toBe("Acropora Budapest");
  });

  it("hat szállítási mód, névre és sorrendre", () => {
    expect(SEED_SETTINGS.szallitasiModok.map((mod) => mod.name)).toEqual([
      "Bolti átvétel",
      "GLS házhozszállítás",
      "GLS csomagpont",
      "GLS nehézáru házhozszállítás",
      "GLS nehézáru csomagpont",
      "Foxpost csomagpont",
    ]);
  });

  it("két fizetési szolgáltató, az utánvéttel együtt", () => {
    expect([...SEED_SETTINGS.fizetesiSzolgaltatok]).toEqual([
      "pp_system_default",
      "pp_acropora_cod",
    ]);
  });

  /**
   * A SEED FEJLECE AZT ALLITJA, HOGY A NEVEK A SZEREP-TABLABOL VALOK -- ES EZT
   * EDDIG SEMMI NEM MERTE.
   *
   * Ha a ket lista elcsuszik, a kiirt `ACROPORA_SO_*` sorok olyan modra
   * mutatnanak, ami nem letezik, vagy egy mod szerep nelkul maradna. Egyik sem
   * hibazik: a bolt elindul, es a vevo nem tud fizetesi modot valasztani.
   *
   * A KORNYEZETI VALTOZO NEVE IS PAROSITVA VAN, nem csak a mod neve. Ket lista,
   * ami ugyanazokat a neveket hordozza mas valtozo-nevekkel, ugyanugy elcsuszott.
   */
  it("ugyanazokat a módokat írja, amiket a szerep-tábla ismer", () => {
    const aSzerepTablabol = SHIPPING_OPTION_ROLE_BINDINGS.map((binding) => ({
      name: binding.name,
      env: binding.env,
    }));
    const aSeedbol = SEED_SETTINGS.szallitasiModok.map((mod) => ({
      name: mod.name,
      env: mod.env,
    }));

    // KONTROLL: mind a ket lista be is toltodott. Ket ures lista egyezne, es a
    // sor zolden allitana, hogy a ket oldal parban all.
    expect(aSeedbol.length).toBe(6);
    expect(aSzerepTablabol.length).toBe(6);
    expect(aSeedbol).toEqual(aSzerepTablabol);
  });
});

/*
  A MASODIK KIKOTES MERES-OLDALA, AMI EDDIG HIANYZOTT.

  Az ujrafuttathatosag a KODBAN all: minden letrehozas elott letezes-ellenorzes
  fut, es a mar meglevot kihagyjuk. De EGYETLEN allitas sem szolt rola -- aki
  kiveszi valamelyik ellenorzest, zold tesztek mellett teszi.

  ES EZ NEM ELMELETI KOCKAZAT: a gyari seed pontosan ezen bukott el a teszt
  gepen. Huszonegy ertekesitesi csatorna keletkezett, ebbol husz ures Default,
  plusz huszonnyolc api kulcs. Nem egy hiba tortent hussszor, hanem EGY hiany
  huszszor.

  A FORRAST OLVASSUK, NEM A FUTAST. A `seed` egy Medusa containert var, es a
  benne futo workflow-k halozatot es adatbazist ernek el; egy futtato teszt
  ehhez az egesz keretet ki kellene valtania. A szerkezeti allitas olcsobb, es
  EPP AZT a valtozast fogja meg, amitol felunk: egy kivett vagy elfelejtett
  ellenorzest.

  AMIT EZ NEM BIZONYIT, kimondva: hogy a seed VALOBAN idempotens. Azt csak egy
  ketszeri eles futas mondja meg. Ez az allitas annyit ver, hogy az
  ellenorzesek OTT VANNAK -- se tobbet, se kevesebbet.
*/
describe("a seed újrafuttathatósága", () => {
  const forras = readFileSync(
    join(__dirname, "..", "initial-data-seed.ts"),
    "utf8",
  );

  it("a forrás betöltődött, és tartalmazza a seedet", () => {
    // ISMERT POZITIV KONTROLL. Egy ures vagy rossz utrol olvasott fajl minden
    // lenti allitast teljesitene: nulla letrehozas, nulla ellenorzes.
    expect(forras.length).toBeGreaterThan(5000);
    expect(forras).toContain("SEED_SETTINGS");
  });

  it("minden entitás, amit létrehozunk, létezés-ellenőrzés mögött áll", () => {
    const ellenorzott = [...forras.matchAll(/await letezik\("([a-z_]+)"/g)].map(
      (m) => m[1],
    );
    // A `tax_region` sajat alakban ellenorzi magat (`adoteruletek?.length`),
    // mert ott az azonosito nem a `name`, hanem a `country_code`.
    expect(forras).toContain("if (adoteruletek?.length)");
    expect(ellenorzott.sort()).toEqual([
      "region",
      "sales_channel",
      "shipping_option",
      "stock_location",
    ]);
  });

  it("a létrehozó hívások száma nem nőtt az ellenőrzöttek mögött", () => {
    /*
      MI PIROSIT: egy UJ create-workflow, amihez nem irtak ellenorzest. A szam
      nem onmagaban erdekes -- azert all itt, hogy egy bovites ne csuszhasson be
      nemán. Aki hetediket ad hozza, ezt a sort is atirja, es akkor OTT dol el,
      hogy gondolt-e az ismetlodesre.
    */
    const letrehozok = [
      ...forras.matchAll(/create[A-Za-z]+Workflow\(container\)/g),
    ];
    expect(letrehozok.length).toBe(5);
  });
});
