import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

/**
 * A KIRAKAT ESLINT-KONFIGJA (Next 16: a `next lint` parancs megszűnt, a lint `eslint .`, a konfig ESLint 9 "flat" alakú). Ugyanaz a két alap, mint a régi
 * `.eslintrc.json`-ban (`next/core-web-vitals`, `next/typescript`), ugyanaz a `no-unused-vars` beállítás.
 *
 * AMI ÚJ, ÉS AZ OKA (acrobot 59858):
 * - az `eslint-plugin-react-hooks` 7 két új szabálya (`set-state-in-effect`, `immutability`) alapból HIBA; nálunk `warn` szinten indulnak, nem `off`: a találatok láthatók
 *   maradnak, a kapu nem bukik rajtuk, és egy külön lépés javíthatja őket;
 * - a gyökér CJS konfigfájlok (`next.config.js`, `check-env-variables.js`, `tailwind*.js`, ...) `require`-t használnak: a `no-require-imports` rájuk kivételt kap.
 */
export default defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/immutability": "warn",
    },
  },
  {
    files: ["*.{js,cjs}"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  globalIgnores([".next/**", "node_modules/**", "next-env.d.ts"]),
])
