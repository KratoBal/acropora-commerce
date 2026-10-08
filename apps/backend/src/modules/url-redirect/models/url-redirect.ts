import { model } from "@medusajs/framework/utils";

/**
 * ONE OLD ADDRESS AND ITS 301 (SEO P0 PR 7a), projected from Acropora OS, which
 * owns the rules (`UrlRedirect`, PR 6). `source_path` is the normalized path in
 * its stored case; `source_path_lower` is the lookup key, unique, so two sources
 * that differ only in case cannot both exist. `destination_path` is always the
 * final target: the OS collapses chains, and the admin route refuses one.
 */
export const UrlRedirect = model
  .define("url_redirect", {
    id: model.id({ prefix: "urlred" }).primaryKey(),
    source_path: model.text(),
    source_path_lower: model.text(),
    destination_path: model.text(),
    status: model.number().default(301),
  })
  .indexes([
    {
      name: "IDX_url_redirect_source_path_lower_unique",
      on: ["source_path_lower"],
      unique: true,
      where: "deleted_at IS NULL",
    },
  ]);

export default UrlRedirect;
