/**
 * A `jsdom` minimalis tipusa: a kirakat a vitest kornyezetekent mar hasznalja,
 * de a `@types/jsdom` nincs a fuggosegek kozott, es egyetlen konstruktorert nem
 * hozunk be uj csomagot. Csak azt irja le, amit a `kivonat.ts` hasznal.
 */
declare module "jsdom" {
  export class JSDOM {
    constructor(html?: string)
    window: { document: Document }
  }
}
