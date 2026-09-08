import { readdirSync, readFileSync, statSync } from "fs"
import { join } from "path"

import { describe, expect, it } from "vitest"

/**
 * A VEVONEK LATSZO SZOVEG MAGYARUL ALL.
 *
 * MIERT BEJARO, ES NEM FELSOROLAS: a repo tobbi haloja ugyanezt tanulta meg
 * (`terv-token-hasznalat.spec.ts`) -- egy kezzel irt fajl-lista pontosan az UJ
 * esetet hagyja ki, azt, amiert a halo letezik.
 *
 * MIERT KELLETT (picasso atnezese, kartya 64c8452a, 2026-09-08): a lista-nezetek
 * kimaradtak a forditasbol. A store lap cime es vezerloi angolul alltak, es
 * ugyanez a mintazat allt a termeklapon is ("Select Kivitel"). A cim es a
 * rendezes azota magyar; ez a halo a MARADEKOT talalta meg, tizenhat helyen.
 *
 * === A HATARA, KIMONDVA, MERT A NULLA FELREVEZET ===
 *
 * A minta egy VEGES szolistara megy. Ami nincs benne, azt nem latja -- tehat a
 * nulla talalat ALSO KORLAT, nem bizonyitek arra, hogy minden szoveg magyar.
 * Egy uj angol szoveg, ami a lista egyik szavat sem hasznalja, csendben atmegy.
 *
 * Ezert all mellette az `a háló lát` allitas: az a MINTAT meri, nem a fat.
 * Enelkul egy elrontott regex ugyanugy nullat adna, es a nulla megnyugtatna.
 *
 * AMIT SZINTEN NEM MER: a HELYESSEGET. Egy rossz magyar forditas ezen atmegy.
 */

const KIRAKAT = __dirname

/** A megjegyzeseket kiszedjuk: egy angol szo egy indoklasban nem felirat. */
const kodSzoveg = (szoveg: string) =>
  szoveg.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "")

/**
 * A MINTA A JSX-SZOVEGRE ES A SZOVEG-PROPOKRA KOT, nem barhol allo angol szora.
 * Egy `import`, egy valtozonev vagy egy `data-testid` nem felirat.
 */
const ANGOL = new RegExp(
  "(?:>|placeholder=|title=|label=|aria-label=|alt=)\\s*[\"'{`]?\\s*" +
    "((?:Select|Sort|Search|Add|Remove|Continue|Checkout|Total|Subtotal|" +
    "Shipping|Delivery|Back|Next|Previous|View|Show|Hide|Loading|Empty|" +
    "Sign in|Sign up|Log in|Register|Password|Email|Address|Order|Cart|" +
    "Product|Products|Collection|Collections|Price|Quantity|Options?)" +
    "\\b[^<\"'`{}]{0,44})",
  "g",
)

const fajlok = (mappa: string): string[] => {
  const ki: string[] = []
  for (const e of readdirSync(mappa)) {
    const p = join(mappa, e)
    if (statSync(p).isDirectory()) {
      if (e !== "node_modules") ki.push(...fajlok(p))
    } else if (e.endsWith(".tsx") && !e.includes(".spec.")) {
      ki.push(p)
    }
  }
  return ki
}

describe("a vevőnek látszó szöveg magyarul áll", () => {
  /**
   * ISMERT POZITIV KONTROLL, ES EZ A MINTAT MERI, NEM A FAT.
   *
   * Egy elrontott regex ugyanazt a nullat adna, mint egy tiszta fa -- es a
   * nulla megnyugtat. Ez az allitas mondja meg, hogy a halo lat.
   */
  it("a háló lát: egy mintaszövegen megtalálja az angol feliratot", () => {
    const pelda = '<span className="text-sm">Select {title}</span>'

    expect(pelda.match(new RegExp(ANGOL.source, "g"))).toHaveLength(1)
  })

  /** ISMERT POZITIV KONTROLL: a bejaras tenyleg talal fajlokat. */
  it("a bejárás lát: a kirakat forrásfájljai megvannak", () => {
    expect(fajlok(KIRAKAT).length).toBeGreaterThan(100)
  })

  it("egyetlen angol felirat sem maradt a fában", () => {
    const talalat: string[] = []

    for (const p of fajlok(KIRAKAT)) {
      const kod = kodSzoveg(readFileSync(p, "utf-8"))
      for (const m of Array.from(kod.matchAll(new RegExp(ANGOL.source, "g")))) {
        const s = m[1].trim()
        if (s && !s.startsWith("{")) {
          talalat.push(`${p.replace(KIRAKAT, "")}: ${s}`)
        }
      }
    }

    expect(talalat).toEqual([])
  })
})
