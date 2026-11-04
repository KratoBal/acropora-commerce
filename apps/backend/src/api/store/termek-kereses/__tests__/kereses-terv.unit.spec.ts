import { likeEscape, sqlFeltetelek } from "../kereses-sql";
import {
  keresesiTerv,
  kulcs,
  MAX_SZO,
  SZINONIMA_CSOPORTOK,
  szoMinta,
  toalak,
  type Feltetel,
} from "../kereses-terv";

/**
 * A KERESESI TERV (V4.1, kartya f59d7d12; korall listaja es atveteli probaja:
 * exchange/otletek-2026-11-04/kereso-szinonimak.md).
 *
 * MI PIROSIT: ha egy csoport-tag (az egybeirt "fehérjelefölöző" is) nem a
 * csoport tobbi tagjat is keresi; ha egy rovidites (KH, ATO, Ca) reszszovegkent
 * menne; ha a toldalekos alak nem a tovevel illeszkedik; ha egy rovid szo tovet
 * csonkitanank; ha a nem szinonima (pumpa) csoportba kerulne; ha egy ertek a
 * lekerdezes szovegebe kerulne.
 */
const reszek = (f: Feltetel) =>
  f.filter((i) => i.fajta === "resz").map((i) => i.ertek);
const szavak = (f: Feltetel) =>
  f.filter((i) => i.fajta === "szo").map((i) => i.ertek);

describe("keresesi terv", () => {
  it("a lehabzo csoport minden tagjarol ugyanaz a feltetel, az egybeirt alakbol is", () => {
    const lehabzo = keresesiTerv("lehabzó");
    expect(lehabzo).toHaveLength(1);
    for (const kerdes of [
      "skimmer",
      "protein skimmer",
      "fehérje lefölöző",
      "fehérjelefölöző",
      "fehérje-lefölöző",
      "lefolozo",
    ]) {
      const terv = keresesiTerv(kerdes);
      expect(terv).toHaveLength(1);
      expect(new Set(reszek(terv[0]!))).toEqual(new Set(reszek(lehabzo[0]!)));
    }
    expect(reszek(lehabzo[0]!)).toEqual(
      expect.arrayContaining(["lehabzo", "skimmer", "feherje lefolozo"]),
    );
  });

  it("a wavemaker az aramoltatot is keresi, a pumpa nem csoporttag", () => {
    expect(reszek(keresesiTerv("wavemaker")[0]!)).toContain("aramoltato");
    expect(keresesiTerv("pumpa")).toEqual([
      [{ fajta: "resz", ertek: "pumpa" }],
    ]);
  });

  it("a rovidites szohatarral megy, a parja reszszovegkent", () => {
    const kh = keresesiTerv("KH")[0]!;
    expect(szavak(kh)).toEqual(["kh"]);
    expect(reszek(kh)).toContain("karbonatkemenyseg");
    expect(szavak(keresesiTerv("karbonátkeménység")[0]!)).toEqual(["kh"]);
    expect(szavak(keresesiTerv("ATO")[0]!)).toEqual(["ato"]);
    expect(szavak(keresesiTerv("Ca")[0]!)).toEqual(["ca"]);
    expect(szavak(keresesiTerv("RO/DI")[0]!)).toEqual(["ro/di"]);
  });

  it("a tobb szavas tag egy feltetel, a mellette allo szo egy masik", () => {
    const terv = keresesiTerv("automata utántöltő Jebao");
    expect(terv).toHaveLength(2);
    expect(szavak(terv[0]!)).toEqual(["ato"]);
    expect(terv[1]).toEqual([{ fajta: "resz", ertek: "jebao" }]);
  });

  it("a toldalek lekerul, de csak ha legalabb ot betus to marad", () => {
    expect(toalak("lehabzok")).toBe("lehabz");
    expect(toalak("aramoltatok")).toBe("aramoltat");
    expect(toalak("pumpat")).toBe("pumpa");
    expect(toalak("korallok")).toBe("korall");
    // a vegyszernevek -at vege a szo resze (barracuda, #650): a szilikat nem "szili" (szilikon), a karbonat nem "karbon"
    expect(toalak("nitrat")).toBe("nitrat");
    expect(toalak("foszfat")).toBe("foszfat");
    expect(toalak("szilikat")).toBe("szilikat");
    expect(toalak("szilikatot")).toBe("szilikat");
    expect(toalak("karbonat")).toBe("karbonat");
    expect(toalak("szulfatok")).toBe("szulfat");
    expect(toalak("karbonatkemenyseg")).toBe("karbonatkemenyseg");
    expect(toalak("teszt")).toBe("teszt");
    expect(keresesiTerv("lehabzók")).toEqual([
      [{ fajta: "resz", ertek: "lehabz" }],
    ]);
  });

  it("hosszu kerdesbol legfeljebb a hatarnyi feltetel lesz, az ismetelt szo egy feltetel (barracuda, #650)", () => {
    expect(
      keresesiTerv(
        Array(500)
          .fill("szo")
          .map((s, i) => s + i)
          .join(" "),
      ).length,
    ).toBe(MAX_SZO);
    expect(keresesiTerv(Array(500).fill("ato").join(" "))).toHaveLength(1);
    expect(keresesiTerv("KH kh karbonátkeménység")).toHaveLength(1);
    expect(keresesiTerv("lehabzók lehabzót")).toHaveLength(1);
  });

  it("ures kerdesbol nincs feltetel", () => {
    expect(keresesiTerv("   ")).toEqual([]);
  });

  it("egy kulcs nem all ket kulonbozo csoportban (az irasmod-valtozat egy csoporton belul rendben van)", () => {
    const hol = new Map<string, Set<number>>();
    SZINONIMA_CSOPORTOK.forEach((csoport, i) =>
      csoport.forEach((tag) =>
        hol.set(kulcs(tag), (hol.get(kulcs(tag)) ?? new Set()).add(i)),
      ),
    );
    expect([...hol].filter(([, csoportok]) => csoportok.size > 1)).toEqual([]);
  });
});

describe("a terv SQL-je", () => {
  it("az ertekek helyorzobe mennek, a szoveg nem kerul a lekerdezesbe", () => {
    const { feltetelek, ertekek } = sqlFeltetelek(keresesiTerv("KH lehabzó"));
    expect(feltetelek).not.toContain("lehabz");
    expect(feltetelek).not.toMatch(/\bkh\b/);
    // KH: 1 illesztes x 4 oszlop (cim, alcim, leiras, sku)
    expect(ertekek.filter((e) => e === szoMinta("kh"))).toHaveLength(4);
    expect(ertekek).toContain("%lehabzo%");
    expect(feltetelek.split(" AND (").length).toBeGreaterThanOrEqual(2);
  });

  it("a felhasznalo % es _ jele a LIKE-ban betu, nem joker", () => {
    expect(likeEscape("50%_a\\b")).toBe("50\\%\\_a\\\\b");
    const { feltetelek, ertekek } = sqlFeltetelek(keresesiTerv("50%"));
    expect(ertekek).toContain("%50\\%%");
    expect(feltetelek).toContain("ESCAPE");
  });

  it("a rovidites mintaja szohatart kap, es a regex-jeleket kiveszi", () => {
    expect(szoMinta("kh")).toBe("\\mkh\\M");
    expect(szoMinta("ro/di")).toBe("\\mro/di\\M");
    expect(szoMinta("a.b")).toBe("\\ma\\.b\\M");
  });
});
