import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import { ContainerRegistrationKeys } from "@medusajs/framework/utils";

import {
  sendStorefrontRevalidate,
  storefrontRevalidateConfig,
} from "../../../workflows/utils/storefront-revalidate";
import { redirectListOf, resolveService } from "./helpers";
import { AdminPutUrlRedirectsType } from "./validators";

/**
 * THE SHOP'S REDIRECT LIST (SEO P0 PR 7a). The only writer is the Acropora OS
 * projection (PR 7b): direction OS -> Medusa, the whole list, full replace. GET
 * gives the fingerprint the OS compares against.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  res.json({ url_redirects: await redirectListOf(req.scope) });
};

export const PUT = async (
  req: MedusaRequest<AdminPutUrlRedirectsType>,
  res: MedusaResponse,
) => {
  await resolveService(req.scope).replaceUrlRedirects(
    req.validatedBody.redirects,
  );
  // the storefront keeps the list in its cache (tag `redirects`, PR 7c); a
  // failed call is logged, never thrown: the list expires on its own
  const config = storefrontRevalidateConfig(process.env);
  if (config)
    await sendStorefrontRevalidate(
      config,
      req.scope.resolve(ContainerRegistrationKeys.LOGGER),
      fetch,
      ["redirects"],
    );
  res.json({ url_redirects: await redirectListOf(req.scope) });
};
