import { defineConfig } from "vitest/config"
import path from "node:path"

/**
 * A KIRAKAT TESZT-BEÁLLÍTÁSA.
 *
 * === MIÉRT KELL A jsdom, ÉS MIT NYERÜNK VELE ===
 *
 * A tiszta függvények (döntés, jelző-olvasás, cím) jsdom nélkül is mérhetők, és
 * eddig CSAK azok voltak mérve. A kirajzolás nem: pont az az ág, ami a vevő elé
 * kerül. Egy jelentés, ami kimondja, hogy egy utat semmi nem mér, és utána
 * mégis kiküldi rajta a funkciót, nem jelentés, hanem megjegyzés.
 *
 * === AZ ÚTVONAL-FELOLDÁS ITT MEGISMÉTLŐDIK, ÉS EZ NEM MÁSOLÁS ===
 *
 * A `@modules/...` alakot a Next a `tsconfig.json` `paths` mezőjéből oldja fel,
 * a vitest viszont nem olvassa azt. A két hely külön romolhat el: ha egy alias
 * ott változik, itt csendben egy MÁSIK fájl töltődne be. Ezért a lista rövid, és
 * csak azt tartalmazza, amit a tesztek tényleg használnak.
 */
export default defineConfig({
  test: {
    environment: "jsdom",
    globals: false,
    setupFiles: ["./vitest.setup.ts"],
    /*
      A FUTAS SAJAT KORNYEZETE, NEM AZ ELO SHELLE (2026-11-12, murena merese).
      A vitest csak akkor allitja `NODE_ENV=test`-re, ha a valtozo meg NINCS beallitva. Egy fejlesztoi
      shell vagy egy agens-kornyezet, ahol `NODE_ENV=development` all, ezt eltolja: a `next/image`
      alapertelmezett betoltoje a kulso kep gazdagepet `test` alatt NEM ellenorzi, mashol igen, ezert a
      teljes sor 82 hibaval bukott (`hostname "shop.example.test" is not configured`), a CI (nincs
      beallitva) viszont zold volt. Ugyanaz a sor ugyanazon a main-en: 82 piros kontra 365 fajl zold,
      egyetlen kornyezeti valtozotol fuggoen. Itt kimondva a `test`, igy a futas nem fugg attol,
      honnan indul.
    */
    env: { NODE_ENV: "test" },
  },
  // A Next az automatikus JSX-futtatot hasznalja; a vitest sajat forditoja nem
  // veszi at ezt a beallitast, ezert kell kimondani. Enelkul minden komponens-
  // teszt "React is not defined" hibaval hasal el.
  esbuild: { jsx: "automatic" },
  resolve: {
    alias: {
      "@modules": path.resolve(__dirname, "./src/modules"),
      "@lib": path.resolve(__dirname, "./src/lib"),
    },
  },
})
