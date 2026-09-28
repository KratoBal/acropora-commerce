/*
 * A Figma Foundations tokenek Tailwind-temaja (P1a, 2026-09-28).
 *
 * UGYANABBOL A FIXTURABOL EPUL, mint amihez a CSS-t a teszt meri
 * (`src/styles/__fixtures__/figma-foundations.json`).
 *
 * AZERT ALL A `src`-N KIVUL: CommonJS-nek kell lennie, mert a
 * `tailwind.config.js` `require`-rel tolti be, a `src` lintje pedig a `require`-t
 * tiltja. Ugyanaz a helyzet, mint maga a `tailwind.config.js`. Minden ertek egy `--acr-*`
 * CSS-valtozora mutat, nem masolja az erteket: a szin egy helyen el
 * (`acropora-tokens.css`), es a Tailwind csak nevet ad hozza.
 *
 * Minden kulcs `acr` elotagu, tehat egy meglevo osztalyt sem ir felul.
 */
const foundations = require("./src/styles/__fixtures__/figma-foundations.json")

const colors = Object.fromEntries(
  Object.keys(foundations.colors).map((name) => [
    name,
    `var(--acr-color-${name})`,
  ])
)
colors.mode = Object.fromEntries(
  Object.keys(foundations.modes.commerce).map((name) => [
    name,
    `var(--acr-mode-${name})`,
  ])
)

const fontFamily = {
  "acr-sans": ["var(--acr-font-sans)"],
  "acr-serif": ["var(--acr-font-serif)"],
  "acr-wordmark": ["var(--acr-font-wordmark)"],
}

const fontSize = Object.fromEntries(
  Object.entries(foundations.textStyles).map(([name, s]) => [
    `acr-${name}`,
    [
      `${s.size}px`,
      {
        lineHeight: `${s.lineHeight}px`,
        letterSpacing: `${s.letterSpacing}px`,
        fontWeight: String(s.weight),
      },
    ],
  ])
)

const spacing = Object.fromEntries(
  Object.keys(foundations.spacing).map((name) => [
    `acr-${name}`,
    `var(--acr-space-${name})`,
  ])
)

const borderRadius = Object.fromEntries(
  Object.keys(foundations.radius).map((name) => [
    `acr-${name}`,
    `var(--acr-radius-${name})`,
  ])
)

const boxShadow = { "acr-subtle": "var(--acr-shadow-subtle)" }

module.exports = {
  colors: { acr: colors },
  fontFamily,
  fontSize,
  spacing,
  borderRadius,
  boxShadow,
}
