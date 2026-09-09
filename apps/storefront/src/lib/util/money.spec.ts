import { describe, expect, it } from "vitest"

import { convertToLocale } from "./money"

/**
 * A PENZ-ALAK: A KIRAJZOLT SZTRINGRE MERUNK, NEM A HIVAS ALAKJARA.
 *
 * acrobot kikotese (2026-09-09), es helyes: egy `minimumFractionDigits: 0`
 * BEALLITAS letezese nem azonos azzal, hogy a lapon nincs tizedes. Ezert itt
 * nem a parameterezest nezzuk, hanem azt, hogy MI JON KI.
 *
 * === MIERT KELL EZ, HA MA JO ===
 *
 * Ez a fuggveny allitja elo a bolt MINDEN penz-szoveget, es 2026-09-09-ig
 * EGYETLEN allitas sem tartozott hozza. Egyszer mar el is romlott: az
 * alapertelmezett `en-US` mellett `HUF 1,200` allt a termeklapon `1200 Ft`
 * helyett. A javitas (a `hu-HU` alapertelmezes) azota bent van, es most orzo
 * is all mellette.
 *
 * Balazs 2026-09-09-en kepernyokepet kuldott `151 990,00 Ft` alakrol.
 * Visszamerve a kitelepitett lapon UGYANARRA a termekre
 * (`ecotech-marine-vortech-mp10qd`): `151 990 Ft`, tizedes nelkul -- vagyis a
 * kep a javitas ELOTTI allapotot mutatta. Nem kellett javitani; az hianyzott,
 * hogy semmi ne engedje vissza.
 */
describe("a pénz-alak", () => {
  /**
   * A SZOKOZOK NORMALIZALVA VANNAK, ES EZ NEM KENYELEM.
   *
   * Az `Intl` NEM SIMA szokozt tesz az ezresek koze, hanem NEM TORO szokozt
   * (U+00A0) -- mertem: `31 35 31 a0 39 39 30 a0 46 74`. Ha a vart erteket
   * sima szokozzel irnank, a teszt egy LATHATATLAN karakteren bukna, es a
   * hibauzenet `expected '151 990 Ft' to be '151 990 Ft'` alakban jelenne meg,
   * ami ket egyforma sztringnek latszik. (Az elso valtozatom pontosan igy
   * bukott el.)
   *
   * A masik ut az lett volna, hogy beirjuk a nem toro szokozt a fajlba -- de
   * azt a kovetkezo olvaso nem latja, es egy szerkeszto veletlenul kicsereli.
   * A normalizalas KIMONDJA, hogy a szokoz FAJTAJA nem a mi allitasunk targya;
   * a tizedes hianya es a tagolas HELYE az.
   */
  const szokozNelkul = (s: string) => s.replace(/\s/g, " ")

  it("forintnál nincs tizedes", () => {
    expect(
      szokozNelkul(convertToLocale({ amount: 151990, currency_code: "huf" })),
    ).toBe("151 990 Ft")
  })

  /**
   * A TAGADAS KULON ERTEK: a fenti allitas egy KONKRET sztringre mer, tehat egy
   * MASIK osszegnel visszakerulo tizedest nem venne eszre. Ez a ket eset azt
   * meri, hogy a tizedes SEHOL nem jon vissza -- kerek es tort osszegnel sem.
   */
  it("semmilyen összegnél nem jelenik meg tizedes", () => {
    for (const osszeg of [0, 1, 999, 1200, 151990, 1234567]) {
      expect(
        convertToLocale({ amount: osszeg, currency_code: "huf" }),
      ).not.toMatch(/,\d/)
    }
  })

  /**
   * ES A NAGY SZAMOK TAGOLASA MAGYAR ALAKU: szokoz, nem vesszo. A regi `en-US`
   * alapertelmezes epp ezt rontotta el (`1,200`), es a hiba ott sem a
   * tizedesben volt.
   */
  it("az ezres tagolás szóköz, nem vessző", () => {
    const ki = convertToLocale({ amount: 1234567, currency_code: "huf" })

    expect(ki).not.toContain(",")
    expect(szokozNelkul(ki)).toBe("1 234 567 Ft")
  })

  /**
   * DEVIZA NELKUL a puszta szam megy vissza -- ez a starter viselkedese, es
   * azert all itt allitas rajta, mert egy `Intl` hivas ures devizakoddal
   * KIVETELT dobna, nem ures sztringet adna.
   */
  it("deviza nélkül a puszta összeg megy vissza", () => {
    expect(convertToLocale({ amount: 1200, currency_code: "" })).toBe("1200")
  })
})
