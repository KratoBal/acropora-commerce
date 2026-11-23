// @vitest-environment node
import { readFileSync, readdirSync, statSync } from "node:fs"
import { join } from "node:path"

import { describe, expect, it } from "vitest"

/**
 * AZ `updateTag` CSAK SZERVER-AKCIÓBAN ÉL (Next 16; barracuda 59862, 59861): renderelés vagy route handler alatt hibát dob. Ami pirosít: egy `updateTag`-et használó fájl nem
 * `"use server"` fájl (a hívás így renderből is elérhető lenne); egy `app/api` route `updateTag`-et hív (route handlerben `revalidateTag(tag, { expire: 0 })` kell, az azonnali
 * lejárat a Next 15 egyargumentumú `revalidateTag`-jének viselkedése); az adatréteg egyargumentumú `revalidateTag`-et hív (a Next 16 típusa ezt amúgy is elutasítja, a tsc).
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
        kod.matchAll(/\brevalidateTag\(([^)]*)\)/g),
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
})
