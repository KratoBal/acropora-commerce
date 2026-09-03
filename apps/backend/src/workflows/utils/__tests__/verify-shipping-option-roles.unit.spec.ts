import { SHIPPING_OPTION_ROLE_BINDINGS } from "../shipping-option-roles";
import {
  describeMissingShippingOptions,
  describeUncheckableShippingOptions,
  verifyShippingOptionRoles,
} from "../verify-shipping-option-roles";

/**
 * A NEMA KASSZA A TET.
 *
 * Ha a hat azonosito kozul barmelyik nem letezik ebben az adatbazisban, a bolt
 * ELINDUL, a fizetesi jogosultsag ures listat ad, es a vevo nem tud fizetesi
 * modot valasztani. Hibauzenet nincs sehol.
 */

const MIND = SHIPPING_OPTION_ROLE_BINDINGS.map((b) => b.id);

describe("a szállítási mód azonosítóinak indulási ellenőrzése", () => {
  it("mind a hat megvan -> nincs hiány", () => {
    const v = verifyShippingOptionRoles(MIND, {});
    expect(v.missing).toEqual([]);
    // ES VAN MIT ELLENORIZNI. Egy ures kotes-tabla is "nulla hianyt" adna --
    // ez a sor koti le, hogy nem azt merjuk.
    expect(v.checked).toBe(6);
  });

  it("EGY hiányzó azonosítót megnevez, a többi ötöt nem", () => {
    /*
      TESTVER-KONTROLL: az allitas nem az, hogy "valami hianyzik", hanem hogy
      PONTOSAN az az egy. Enelkul egy "mindent hianyzonak jelol" valtozat is
      atmenne.
    */
    const egyNelkul = MIND.slice(1);
    const v = verifyShippingOptionRoles(egyNelkul, {});
    expect(v.missing).toHaveLength(1);
    expect(v.missing[0]!.id).toBe(MIND[0]);
    expect(v.checked).toBe(6);
  });

  it("a környezeti felülírást is ellenőrzi, nem a beégetett értéket", () => {
    /*
      MI PIROSIT: ha a fuggveny a tabla nyers id-jait nezne a feloldottak
      helyett. Akkor egy MASIK kornyezetre allitott override melle azt mondana,
      hogy minden rendben -- vagyis epp abban az esetben hallgatna, amiert az
      egesz ellenorzes keszult.
    */
    const binding = SHIPPING_OPTION_ROLE_BINDINGS[0]!;
    const v = verifyShippingOptionRoles(MIND, { [binding.env]: "so_masik" });
    expect(v.missing).toHaveLength(1);
    expect(v.missing[0]!.id).toBe("so_masik");
  });

  it("az üzenet megnevezi a változót és a pótlás helyét", () => {
    // Egy megallas indoklas nelkul dragabb, mint amennyit er.
    const v = verifyShippingOptionRoles(MIND.slice(1), {});
    const uzenet = describeMissingShippingOptions(v);
    expect(uzenet).toContain(SHIPPING_OPTION_ROLE_BINDINGS[0]!.env);
    expect(uzenet).toContain("backend:seed");
    // A KOVETKEZMENY IS BENNE ALL, nem csak a teendo: enelkul egy megallas
    // ugy nezne ki, mint egy tulzo ovatossag.
    expect(uzenet).toContain("hibaüzenet nélkül");
  });

  it("a 'nem tudtam megnézni' MÁS üzenet, és NEM állítja meg a boltot", () => {
    /*
      KET KULONBOZO ALLAPOT, KET KULONBOZO TEENDO. Egy kozos mondat a masodikat
      elrejtene az elso mogott -- ugyanaz az alak, mint az URES gyorsitotar a
      telefonon: a "nem talaltam egyezest" akkor is igaz, ha semmit nem
      kerestunk.
    */
    const uzenet = describeUncheckableShippingOptions(
      "nincs adatbázis-kapcsolat",
    );
    expect(uzenet).toContain("NEM tudtam ellenőrizni");
    expect(uzenet).toContain("ELLENŐRZÉS NÉLKÜL");
    expect(uzenet).not.toContain("A bolt nem indul el");
  });
});
