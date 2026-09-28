import medusaPackage from "@medusajs/medusa/package.json";

/**
 * The Medusa version this process actually loaded, read from the installed
 * package rather than from our own `package.json`.
 *
 * Our manifest says what was ASKED for; the installed package says what is
 * RUNNING. They agree today because every `@medusajs/*` dependency is pinned
 * exactly, but a version alignment (2.19.0 on the backend, 2.20.1 in the
 * storefront, measured 2026-09-28) is exactly the change this field is meant to
 * prove on a live instance, so it reads the thing that ran.
 *
 * `@medusajs/medusa` exports `./package.json` explicitly, so this import is
 * part of the package's public surface, not a reach into its internals.
 */
export const runningMedusaVersion = (
  pkg: { version?: unknown } = medusaPackage,
): string | null =>
  typeof pkg.version === "string" && pkg.version.trim()
    ? pkg.version.trim()
    : null;
