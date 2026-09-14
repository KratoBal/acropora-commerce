import { readFileSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * A LEIRAS-TABLAZAT SAVJA A LAP VILAGABOL JON -- ES A HOROG MINDEN HIVOHELYEN OTT VAN.
 *
 * === MIT VALT KI EZ A SPEC ===
 *
 * A savot 2026-09-14-ig a tarolt HTML hordozta, inline: `background-color:
 * #d9d9d9`. A tisztito ezt mar nem engedi at (`sanitize-description.ts`), tehat
 * a sav a `globals.css` felelossege lett. Ket allitas kell hozza, es KULON
 * romolhatnak el:
 *
 *   1. a szabaly tokenbol veszi a szint, nem rogzitett ertekbol
 *   2. minden hely, ami leirast rajzol ki, viseli a `leiras-tartalom` horgot
 *
 * A masodik a torekenyebb. A leiras HAROM helyen kerul a lapra, es a harmadikat
 * (`valodi-tartalom.tsx` `Leiras` doboza) ma SEMMI nem hivja -- egy hianyzo
 * osztaly ott a bekotes napjaig lathatatlan maradna. Ugyanez a hibaosztaly mar
 * megtortent egyszer: a vaz megkerulte a `product-info` fajlt, es a fulek
 * kimaradtak a tisztitasbol.
 *
 * === A HATAR, KIMONDVA ===
 *
 * Ez a spec FORRAST olvas, nem kirajzolt lapot. Azt bizonyitja, hogy a horog es
 * a szabaly egy helyen all -- azt nem, hogy a bongeszo milyen szint szamol
 * belole. Kiszamolt szinre a kirakatnak nincs merohelye (vitest plusz jsdom),
 * az elo lapon mert ertek a `scripts/lap-szin.sh` dolga.
 */

const CSS = readFileSync(join(__dirname, "globals.css"), "utf8")

const HIVOHELYEK = [
  "../modules/products/components/product-description-tabs/index.tsx",
  "../modules/products/components/lap-vaz/valodi-tartalom.tsx",
]

describe("a leiras-tablazat savja", () => {
  it("a sav-szin tokenbol jon, nem rogzitett ertekbol", () => {
    expect(CSS).toContain(".leiras-tartalom tbody tr:nth-child(odd)")

    const blokk = CSS.slice(
      CSS.indexOf(".leiras-tartalom tbody tr:nth-child(odd)"),
    ).slice(0, 200)
    expect(blokk).toContain("var(--terv-hatter-halvany)")
    /**
     * ISMERT NEGATIV: egy hexa ertek itt azt jelentene, hogy a sav ugyanugy
     * rogzitett szint visel, mint a regi bolt #d9d9d9 erteke -- csak most a mi
     * fajlunkban. A javitas ertelme epp az, hogy a szin a lap vilagabol jojjon.
     */
    expect(blokk).not.toMatch(/#[0-9a-f]{3,8}/i)
  })

  it("a cellak kaptak belso terkozt, kulonben a savok osszeernek", () => {
    expect(CSS).toContain(".leiras-tartalom :is(td, th)")
  })

  /**
   * A SZAMOLAS ALAKJA, ES MIERT IGY: minden `dangerouslySetInnerHTML` egy
   * kirajzolt leiras (merve 2026-09-14: a kirakat forrasaban osszesen harom
   * ilyen hely all, mind a harom leiras). Ha egy uj hely keletkezik horog
   * nelkul, a ket szam szetcsuszik, es ez a spec szol.
   *
   * A komment-sorokat le kell szedni, mert a fenti magyarazatok maguk is
   * tartalmazzak mind a ket szot -- kulonben a sajat szovegunket szamolnank.
   */
  it("minden kirajzolt leiras viseli a horgot", () => {
    let injektalas = 0
    let horog = 0

    for (const relativ of HIVOHELYEK) {
      const forras = readFileSync(join(__dirname, relativ), "utf8")
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "")

      injektalas += (forras.match(/dangerouslySetInnerHTML/g) ?? []).length
      horog += (forras.match(/leiras-tartalom/g) ?? []).length
    }

    expect(injektalas).toBe(3)
    expect(horog).toBe(injektalas)
  })
})
