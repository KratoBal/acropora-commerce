import { readFileSync } from "node:fs";
import { join } from "node:path";

import { SHIPPING_OPTION_ROLE_BINDINGS } from "../../workflows/utils/shipping-option-roles";
import { adoteruletBemenet, SEED_SETTINGS } from "../initial-data-seed";

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

  /**
   * AZ ADÓKULCSNAK KÓDJA IS VAN, ÉS EZT ÉLES BUKÁS ÍRATTA IDE.
   *
   * A `code` a MikroORM validálásában kötelező, a TypeScript típusában
   * viszont elhagyható -- tehát a fordító NEM szól, ha kiesik. Az éles
   * futás 2026-09-03-án pontosan ezen hasalt el.
   *
   * AMIT EZ AZ ÁLLÍTÁS BIZONYÍT, ÉS AMIT NEM. Bizonyítja, hogy a konstans
   * hordoz kódot, tehát a mező kiesése a konstansból pirosat ad. NEM
   * bizonyítja, hogy a workflow-hívás át is adja: ehhez a hívás futtatása
   * kellene, az pedig adatbázist igényel. A hívás oldalát a következő éles
   * futás méri -- és a PR törzse ezt feltételként mondja ki, nem
   * lábjegyzetként.
   */
  it("az adókulcsnak van kódja, mert a nélkül a seed futásidőben elhasal", () => {
    expect(typeof SEED_SETTINGS.ado.kulcsKodja).toBe("string");
    expect(SEED_SETTINGS.ado.kulcsKodja.trim().length).toBeGreaterThan(0);
  });

  /**
   * ÉS AMIT A FENTI ÁLLÍTÁS NEM FOG MEG -- EZÉRT ÁLL ITT EGY MÁSODIK.
   *
   * A fenti a KONSTANST nézi. Ha valaki a `code:` sort a HÍVÁSBÓL veszi ki,
   * a konstans változatlan marad, a fenti állítás zöld, és a seed ugyanúgy
   * hagyna maga után kulcs nélküli adóterületet -- pontosan az az állapot,
   * ami 2026-09-03-án élesben előállt.
   *
   * Ez az állítás ezért azt az OBJEKTUMOT nézi, amit a workflow MEGKAP.
   * Adatbázis nem kell hozzá: nem a futást mérjük, hanem a hívás alakját.
   */
  it("az adóterület bemenete átadja a kulcs kódját is a workflow-nak", () => {
    const bemenet = adoteruletBemenet();
    expect(bemenet).toHaveLength(1);

    const kulcs = bemenet[0].default_tax_rate;
    expect(kulcs.name).toBe(SEED_SETTINGS.ado.kulcsNeve);
    expect(kulcs.rate).toBe(SEED_SETTINGS.ado.szazalek);
    expect(kulcs.code).toBe(SEED_SETTINGS.ado.kulcsKodja);
    expect(String(kulcs.code ?? "").trim().length).toBeGreaterThan(0);
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

    // A `shipping_option` SAJAT LEKERDEZEST KAPOTT, es nem gyengites, hanem
    // szigoritas. A puszta letezes ott nem eleg: a szamitott arazasu mod a
    // letrehozas es az onhivatkozas beirasa KOZOTT mar letezik, de meg
    // hasznalhatatlan -- eles futason pontosan ebben az allapotban szakadt meg a
    // szkript. A nevre szuro `letezik` ilyenkor kihagyna, es a hianyzo
    // visszairas soha nem potlodna. Ezert a helyer olvassa a `data` mezot is, es
    // ezert kell a potlas aga is, kulon allitassal.
    expect(forras).toContain("const letezoSzallitasiMod = async");
    expect(forras).toContain("await letezoSzallitasiMod(mod.name)");
    expect(forras).toContain("onhivatkozas !== meglevo.id");

    expect(ellenorzott.sort()).toEqual([
      "region",
      "sales_channel",
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
