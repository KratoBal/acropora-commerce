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
