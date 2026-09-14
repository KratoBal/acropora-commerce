import {
  EKEZETES,
  HAJTOGATOTT,
  hajtogat,
  oszlopHajtogatva,
  szavakra,
} from "../ekezet-hajtogatas";

/**
 * A HAJTOGATAS MIND A KET OLDALRA UGYANAZ.
 *
 * Ez a suite azt orzi, ami a javitas LENYEGE: a vevo kerdese es a tarolt szoveg
 * UGYANARRA az alakra megy. Ha csak az egyik oldalt hajtogatnank, a javitas
 * egyik felet a masikra cserelnenk -- az ekezet nelkuli kereses talalna, az
 * ekezetes viszont elveszne.
 */
describe("ekezet-hajtogatas", () => {
  it("az ekezetes es az ekezet nelkuli alak UGYANARRA hajtogatodik", () => {
    expect(hajtogat("lehabzó")).toBe("lehabzo");
    expect(hajtogat("lehabzo")).toBe("lehabzo");
    expect(hajtogat("lehabzó")).toBe(hajtogat("lehabzo"));
  });

  /**
   * A REGI IRANY, KULON ALLITASSAL (acrobot kerese). A javitas utan az EKEZETES
   * keresesnek TOVABBRA is talalnia kell. Unit szinten ez azt jelenti, hogy a
   * ket alak ugyanoda mutat -- a kovetkezmenyt a kiszolgalt lapon merjuk.
   */
  it("mind a harom mert par egy alakra jon ossze", () => {
    expect(hajtogat("világítás")).toBe(hajtogat("vilagitas"));
    expect(hajtogat("szűrő")).toBe(hajtogat("szuro"));
    expect(hajtogat("Lehabzó")).toBe(hajtogat("LEHABZO"));
  });

  /**
   * NEGATIV KONTROLL (acrobot kerese): ami NEM ugyanaz a szo, az NEM is
   * hajtogatodik egybe. Enelkul a fenti allitasokat egy olyan valtozat is
   * kielegitene, ami MINDENT ugyanarra a szovegre kepez.
   */
  it("ket kulonbozo szo NEM esik egybe", () => {
    expect(hajtogat("szűrő")).not.toBe(hajtogat("szivattyu"));
    expect(hajtogat("zzzzqqqqxxxx")).toBe("zzzzqqqqxxxx");
    expect(hajtogat("lehabzó")).not.toBe(hajtogat("lehabzok"));
  });

  it("az ekezet nelkuli szoveget valtozatlanul hagyja (a kisbetusitest kiveve)", () => {
    expect(hajtogat("quantum")).toBe("quantum");
    expect(hajtogat("DMBS1KG")).toBe("dmbs1kg");
  });

  /**
   * A KET SZTRING HOSSZA KOTELEZOEN EGYEZIK, mert a Postgres `translate()`
   * POZICIO szerint parositja oket. Egy eltevedt betu nem hibazna, csak MAST
   * hajtogatna -- es a kulonbseg csendben rossz talalatokat adna.
   */
  it("az ekezetes es a hajtogatott betusor hossza egyezik", () => {
    expect([...EKEZETES]).toHaveLength([...HAJTOGATOTT].length);
  });

  /**
   * ES A PAROSITAS TENYLEG PARONKENT HELYES, nem csak hosszban. A hosszmeres
   * onmagaban egy OSSZEKEVERT sorrendet is atengedne.
   */
  it("minden ekezetes betu a sajat parjara mutat", () => {
    const parok = [...EKEZETES].map((b, i) => [b, [...HAJTOGATOTT][i]]);
    for (const [ekezetes, hajtogatott] of parok) {
      expect(hajtogat(ekezetes)).toBe(hajtogatott.toLowerCase());
    }
  });

  /** A szavakat ES-sel kotjuk, ahogy a Medusa mag is: a bontas ugyanaz. */
  it("szokozok menten bont, es a szavakat hajtogatja", () => {
    expect(szavakra("  kék   lámpa ")).toEqual(["kek", "lampa"]);
    expect(szavakra("")).toEqual([]);
    expect(szavakra("   ")).toEqual([]);
  });

  /**
   * AZ OSZLOPNEVET A HIVO ADJA, NEM A FELHASZNALO -- es ezt az allitas ki is
   * mondja: a fuggveny a nevet VALTOZATLANUL teszi a lekerdezesbe. Ha valaha
   * felhasznaloi ertek kerulne ide, az SQL-befecskendezes lenne.
   */
  it("a hajtogatott oszlop a Postgres translate() alakjat adja", () => {
    expect(oszlopHajtogatva("p.title")).toBe(
      `translate(lower(p.title), '${EKEZETES}', '${HAJTOGATOTT}')`,
    );
  });
});
