import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";

import { redirectListOf } from "../../admin/url-redirects/helpers";

/**
 * THE REDIRECT LIST FOR THE STOREFRONT MIDDLEWARE (SEO P0 PR 7a, 7c): rows of
 * `[source_path_lower, destination_path, status]`, sorted. The middleware keeps
 * it in memory and looks a request up by its normalized, lowercase path.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { hash, redirects } = await redirectListOf(req.scope);
  res.json({
    hash,
    redirects: redirects.map((r) => [
      r.source_path.toLowerCase(),
      r.destination_path,
      r.status,
    ]),
  });
};
