import { defineConfig, mergeConfig } from "vitest/config"

import alap from "./vitest.config"

/**
 * A RENDERELT HTML SEO-SZERZODESE (FE-8): kulon konfig, mert egy FUTO kirakatot
 * es a Store API-t keri, tehat a rendes `test` futasba nem valo. A `*.seo.ts`
 * fajlokat csak ez a konfig latja; a `vitest.config.ts` alapertelmezett mintaja
 * (`*.spec.ts`, `*.test.ts`) nem.
 */
export default mergeConfig(
  alap,
  defineConfig({
    test: {
      include: ["src/**/*.seo.ts"],
      environment: "node",
      testTimeout: 60_000,
      hookTimeout: 120_000,
      // a mintaoldalak sorban, hogy a kirakatot ne terheljuk egyszerre
      fileParallelism: false,
      sequence: { concurrent: false },
    },
  }),
)
