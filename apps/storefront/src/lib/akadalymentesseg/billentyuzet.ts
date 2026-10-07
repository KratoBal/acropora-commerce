/**
 * A BILLENTYUZETES BEJARAS EGY LAPON (FE-9). Valodi bongeszoben fut
 * (`page.evaluate`), mert a fokusz-stilus a szamolt CSS-bol all, es azt csak
 * egy renderelo bongeszo tudja.
 *
 * A Tab-lanc minden allomasan harom dolgot jegyez fel:
 * - LATHATO-E A FOKUSZ: a fokuszalt elem szamolt stilusa (korvonal, arnyek,
 *   keret, hatter, alahuzas) kulonbozik-e a nem fokuszalt allapotatol. Egy
 *   `outline: none` magaban nem hiba, ha mas jelzi a fokuszt; az a hiba, ha
 *   SEMMI nem valtozik.
 * - VAN-E NEVE (`aria-label`, szoveg, `title`, a hozza kotott `<label>`).
 * - MI AZ ELEM (cimke a hibauzenethez).
 */
export type Allomas = {
  cimke: string
  lathato: boolean
  nev: string
}

export type Bejaras = {
  allomasok: Allomas[]
  /** a lathato, engedelyezett vezerlok, amiket a Tab NEM ert el */
  elerhetetlen: string[]
  /** igaz, ha a lanc a lap vegere ert vagy korbeert (nem ragadt be) */
  kijutott: boolean
}

/** A bongeszoben futo resz; a `page.evaluate`-nek adjuk at. */
export function allomasMost(): Allomas | null {
  const e = document.activeElement as HTMLElement | null
  if (!e || e === document.body) return null
  const kulcsok = [
    "outlineStyle",
    "outlineWidth",
    "outlineColor",
    "boxShadow",
    "borderColor",
    "backgroundColor",
    "textDecorationLine",
  ] as const
  const kep = () => {
    const s = getComputedStyle(e)
    return kulcsok.map((k) => s[k]).join("|")
  }
  const fokuszban = kep()
  e.blur()
  const nyugalomban = kep()
  e.focus()
  const cimkeElem = e.id
    ? document.querySelector(`label[for="${CSS.escape(e.id)}"]`)
    : null
  const nev = (
    e.getAttribute("aria-label") ||
    (e.getAttribute("aria-labelledby") &&
      document.getElementById(e.getAttribute("aria-labelledby")!)
        ?.textContent) ||
    cimkeElem?.textContent ||
    e.closest("label")?.textContent ||
    e.textContent ||
    e.getAttribute("title") ||
    (e as HTMLInputElement).placeholder ||
    ""
  )
    .replace(/\s+/g, " ")
    .trim()
  const azonosito =
    e.id ||
    e.getAttribute("data-testid") ||
    e.getAttribute("name") ||
    e.className.toString().split(" ").slice(0, 2).join(".")
  return {
    cimke: `${e.tagName.toLowerCase()}#${azonosito}`,
    lathato: fokuszban !== nyugalomban,
    nev: nev.slice(0, 60),
  }
}

/** A bongeszoben: a lathato, engedelyezett vezerlok cimkei, a `main`-en belul. */
export function vezerlokMost(): string[] {
  const gyoker = document.querySelector("main") ?? document.body
  return Array.from(
    gyoker.querySelectorAll<HTMLElement>(
      'input:not([type="hidden"]), select, textarea, button, a[href], [tabindex]:not([tabindex="-1"])',
    ),
  )
    .filter(
      (e) =>
        e.offsetParent !== null &&
        !(e as HTMLButtonElement).disabled &&
        e.getAttribute("aria-hidden") !== "true",
    )
    .map(
      (e) =>
        `${e.tagName.toLowerCase()}#${e.id || e.getAttribute("data-testid") || e.getAttribute("name") || e.className.toString().split(" ").slice(0, 2).join(".")}`,
    )
}
