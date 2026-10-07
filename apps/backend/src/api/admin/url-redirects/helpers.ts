import { createHash } from "node:crypto";

import { MedusaContainer } from "@medusajs/framework";

import { URL_REDIRECT_MODULE } from "../../../modules/url-redirect";
import UrlRedirectModuleService from "../../../modules/url-redirect/service";

export const resolveService = (
  scope: MedusaContainer,
): UrlRedirectModuleService => scope.resolve(URL_REDIRECT_MODULE);

export type RedirectRow = {
  source_path: string;
  destination_path: string;
  status: number;
};

const lower = (r: RedirectRow) => r.source_path.toLowerCase();

/** Sorted by the lowercase source (JS string order), so the list is canonical. */
export const sortRedirects = <T extends RedirectRow>(rows: T[]): T[] =>
  [...rows].sort((a, b) =>
    lower(a) < lower(b) ? -1 : lower(a) > lower(b) ? 1 : 0,
  );

/**
 * THE LIST'S FINGERPRINT (PR 7a, 7b). The OS computes the same value and sends
 * the list only when the two differ, so a scheduler round costs one GET. The
 * input is the sorted list of `[source_path, destination_path, status]`, as JSON.
 */
export const redirectsHash = (rows: RedirectRow[]): string =>
  createHash("sha256")
    .update(
      JSON.stringify(
        sortRedirects(rows).map((r) => [
          r.source_path,
          r.destination_path,
          r.status,
        ]),
      ),
    )
    .digest("hex");

/** The stored list, sorted, with its fingerprint. */
export const redirectListOf = async (scope: MedusaContainer) => {
  const rows = await resolveService(scope).listUrlRedirects(
    {},
    { select: ["source_path", "destination_path", "status"], take: null },
  );
  const redirects = sortRedirects(
    rows.map((r) => ({
      source_path: r.source_path,
      destination_path: r.destination_path,
      status: r.status,
    })),
  );
  return { count: redirects.length, hash: redirectsHash(redirects), redirects };
};
