// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * AZ `updateTag` CSAK SZERVER-AKCIÓBAN ÉL (Next 16; barracuda 59862, 59861): renderelés vagy route handler alatt hibát dob. Ami pirosít: egy `updateTag`-et használó fájl nem
 * `"use server"` fájl (a hívás így renderből is elérhető lenne); egy `app/api` route `updateTag`-et hív (route handlerben `revalidateTag(tag, { expire: 0 })` kell, az azonnali
 * lejárat a Next 15 egyargumentumú `revalidateTag`-jének viselkedése); egy app (route/lap) fájl olyan adatréteg-exportot importál, ami közvetve `updateTag`-et hív (a route handler a függvényen át
 * kapná a hibát: #868 review, `payment-return`); az adatréteg egyargumentumú `revalidateTag`-et hív (a Next 16 típusa ezt amúgy is elutasítja, a tsc).
 */
const SRC = join(__dirname, "..", "..")

const fajlok = (mappa: string): string[] =>
  readdirSync(mappa).flatMap((nev) => {
    const ut = join(mappa, nev)
    if (statSync(ut).isDirectory()) return fajlok(ut)
    return /\.(ts|tsx)$/.test(nev) && !/\.(spec|test)\./.test(nev) ? [ut] : []
  })

const kodSorok = (ut: string) =>
  readFileSync(ut, "utf8")
    .split("\n")
    .filter((sor) => !/^\s*(\/\/|\*|\/\*)/.test(sor))
    .join("\n")

describe("a cache-érvénytelenítés Next 16-os alakja", () => {
  const mind = fajlok(SRC)

  it("minden updateTag-et használó fájl use server fájl", () => {
    const hasznalok = mind.filter((ut) => /\bupdateTag\(/.test(kodSorok(ut)))
    expect(
      hasznalok.length,
      "az adatréteg updateTag-et használ",
    ).toBeGreaterThan(3)
    for (const ut of hasznalok)
      expect(readFileSync(ut, "utf8").slice(0, 300), ut).toMatch(
        /["']use server["']/,
      )
  })

  it("route handler nem hív updateTag-et, és a revalidateTag-nek van második argumentuma", () => {
    const routok = mind.filter((ut) => /\/route\.tsx?$/.test(ut))
    for (const ut of routok) {
      const kod = kodSorok(ut)
      expect(kod, ut).not.toMatch(/\bupdateTag\(/)
      for (const hivas of Array.from(
        kod.matchAll(/\brevalidateTag\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g),
      ))
        expect(hivas[1], ut).toContain(",")
    }
  })

  it("nincs egyargumentumú revalidateTag az egész forrásban", () => {
    for (const ut of mind)
      for (const hivas of Array.from(
        kodSorok(ut).matchAll(
          /\brevalidateTag\(([^()]*(?:\([^()]*\)[^()]*)*)\)/g,
        ),
      ))
        expect(hivas[1], ut).toContain(",")
  })

  it("egy szerver-oldali app fájl sem importál olyan exportot az adatrétegből, ami (akár közvetve) updateTag-et hív", () => {
    const adat = ["cart", "customer", "stripe", "payment"].map((nev) =>
      join(SRC, "lib", "data", `${nev}.ts`),
    )
    const fertozott = new Set<string>()
    for (const ut of adat) {
      const sorok = readFileSync(ut, "utf8").split("\n")
      const kezdetek: { sor: number; nev: string; exportalt: boolean }[] = []
      sorok.forEach((sor, i) => {
        const m =
          /^export (?:async )?(?:const|function) (\w+)/.exec(sor) ??
          /^(?:async )?function (\w+)/.exec(sor) ??
          /^const (\w+) = (?:async )?\(/.exec(sor)
        if (m)
          kezdetek.push({
            sor: i,
            nev: m[1],
            exportalt: sor.startsWith("export"),
          })
      })
      const torzsek = kezdetek.map((k, i) => ({
        ...k,
        torzs: sorok
          .slice(
            k.sor,
            i + 1 < kezdetek.length ? kezdetek[i + 1].sor : sorok.length,
          )
          .join("\n"),
      }))
      const bajos = new Set(
        torzsek.filter((f) => /\bupdateTag\(/.test(f.torzs)).map((f) => f.nev),
      )
      for (let valtozott = true; valtozott;) {
        valtozott = false
        for (const f of torzsek)
          if (
            !bajos.has(f.nev) &&
            Array.from(bajos).some((b) =>
              new RegExp(`\\b${b}\\(`).test(f.torzs),
            )
          ) {
            bajos.add(f.nev)
            valtozott = true
          }
      }
      for (const f of torzsek)
        if (f.exportalt && bajos.has(f.nev)) fertozott.add(f.nev)
    }
    expect(
      fertozott.size,
      "az adatreteg exportjai kozott van updateTag-et hivo",
    ).toBeGreaterThan(10)
    const szerverFajlok = fajlok(join(SRC, "app")).filter((ut) => {
      const fej = readFileSync(ut, "utf8").slice(0, 300)
      return !/["']use (client|server)["']/.test(fej)
    })
    for (const ut of szerverFajlok)
      for (const m of Array.from(
        readFileSync(ut, "utf8").matchAll(
          /import\s*\{([^}]*)\}\s*from\s*["']@lib\/data\/(?:cart|customer|stripe|payment)["']/g,
        ),
      )) {
        const importaltak = m[1]
          .split(",")
          .map((x) => x.trim().split(" as ")[0].trim())
        expect(
          importaltak.filter((n) => fertozott.has(n)),
          `${ut}: updateTag-et hivo export szerver-oldali (route/lap) fajlban`,
        ).toEqual([])
      }
  })
})
