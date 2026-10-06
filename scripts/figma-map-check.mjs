import fs from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"

const here = path.dirname(fileURLToPath(import.meta.url))
const repoRoot = path.resolve(here, "..")
const mapPath = path.join(repoRoot, "docs", "FIGMA-MAP.md")

const bases = {
  "apps/storefront": {
    route: "apps/storefront/src/app",
    component: "apps/storefront/src/modules",
  },
}

const skipped = new Set(["", "—", "-", "nincs", "N/A"])

function cleanCell(value) {
  return value
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/\`/g, "")
    .trim()
}

function splitRefs(value) {
  return cleanCell(value)
    .split("\n")
    .map((part) => part.trim())
    .filter((part) => !skipped.has(part))
}

function parseTableRow(line) {
  if (!line.trim().startsWith("|")) return null
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim())
}

function isSeparator(cells) {
  return cells.every((cell) => /^:?-{3,}:?$/.test(cell.replace(/\s/g, "")))
}

function resolveReference(base, reference) {
  let ref = reference.trim()

  if (ref.endsWith("/**")) {
    ref = ref.slice(0, -3)
  } else if (ref.includes("*")) {
    throw new Error(`Nem támogatott glob minta: ${reference}`)
  }

  ref = ref.replace(/\/$/, "")
  return path.resolve(repoRoot, base, ref)
}

if (!fs.existsSync(mapPath)) {
  console.error(`Hiányzik: ${path.relative(repoRoot, mapPath)}`)
  process.exit(1)
}

const markdown = fs.readFileSync(mapPath, "utf8")
const lines = markdown.split(/\r?\n/)

let header = null
let checked = 0
const missing = []
const errors = []

for (const line of lines) {
  const cells = parseTableRow(line)
  if (!cells) {
    header = null
    continue
  }

  if (isSeparator(cells)) continue

  const maybeHeader = cells.map(cleanCell)

  if (maybeHeader[0] === "Figma Page / Section") {
    const required = ["App", "Route pattern", "Component area"]
    const missingHeaders = required.filter((name) => !maybeHeader.includes(name))

    if (missingHeaders.length) {
      errors.push(
        `Hibás FIGMA-MAP tábla fejléc; hiányzik: ${missingHeaders.join(", ")}`,
      )
      header = null
    } else {
      header = maybeHeader
    }
    continue
  }

  if (!header) continue

  const appIndex = header.indexOf("App")
  const routeIndex = header.indexOf("Route pattern")
  const componentIndex = header.indexOf("Component area")

  const app = cleanCell(cells[appIndex] ?? "")
  const config = bases[app]

  const routeRefs = splitRefs(cells[routeIndex] ?? "")
  const componentRefs = splitRefs(cells[componentIndex] ?? "")

  if (!config && (routeRefs.length || componentRefs.length)) {
    errors.push(`Ismeretlen App érték: ${app}`)
    continue
  }

  for (const reference of routeRefs) {
    try {
      const target = resolveReference(config.route, reference)
      checked += 1
      if (!fs.existsSync(target)) {
        missing.push(path.relative(repoRoot, target))
      }
    } catch (error) {
      errors.push(String(error.message ?? error))
    }
  }

  for (const reference of componentRefs) {
    try {
      const target = resolveReference(config.component, reference)
      checked += 1
      if (!fs.existsSync(target)) {
        missing.push(path.relative(repoRoot, target))
      }
    } catch (error) {
      errors.push(String(error.message ?? error))
    }
  }
}

const minimumExpectedReferences = 40
if (checked < minimumExpectedReferences) {
  errors.push(
    `Túl kevés ellenőrzött hivatkozás: ${checked}; minimum: ${minimumExpectedReferences}. Valószínűleg kimaradt vagy hibás fejlécű tábla.`,
  )
}

if (errors.length || missing.length) {
  console.error("FIGMA-MAP ellenőrzés sikertelen.")

  if (errors.length) {
    console.error("\nÉrtelmezési hibák:")
    for (const error of [...new Set(errors)]) {
      console.error(`- ${error}`)
    }
  }

  if (missing.length) {
    console.error("\nNem létező hivatkozások:")
    for (const item of [...new Set(missing)].sort()) {
      console.error(`- ${item}`)
    }
  }

  process.exit(1)
}

console.log(`FIGMA-MAP rendben: ${checked} kódhivatkozás létezik.`)
