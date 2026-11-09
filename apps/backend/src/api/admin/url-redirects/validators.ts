import { z } from "@medusajs/framework/zod";

/**
 * A path of this shop: starts with one `/` (not `//` and not `/\`, which a
 * browser takes as another domain, so the 301 would be an open redirect), and
 * has no `\`, whitespace, control character or query.
 */
const PATH = z
  .string()
  .min(1)
  .max(2048)
  .regex(
    /^\/(?![/\\])[^\s?#\\\u0000-\u001f\u007f]*$/,
    "a path of this shop, without query or space",
  );

/**
 * 301, or 410 for an old address whose product has no page and no brand page
 * (d707cf5f, A9). A 410 row has no destination: the OS sends the source itself
 * there, so the row keeps its shape and the fingerprint stays the same on both
 * sides.
 */
export const GONE = 410;

const Redirect = z
  .object({
    source_path: PATH,
    destination_path: PATH,
    status: z.union([z.literal(301), z.literal(GONE)]),
  })
  .strict()
  .refine((r) => r.status !== GONE || r.destination_path === r.source_path, {
    message: "A 410 row's destination is its own source",
  });

/**
 * THE WHOLE LIST (SEO P0 PR 7a). The OS keeps two rules, and this is the second
 * gate on both, so a hand-written or broken payload cannot reach the shop:
 * - a source appears once, case-insensitively (the lookup is lowercase);
 * - no destination is a source (no chain): the shop follows one hop. A rule
 *   pointing to itself is the shortest chain, so the same check refuses it.
 *   A 410 row is not a hop, so its own destination is not checked; a 301 into
 *   a 410 source still is.
 */
export const AdminPutUrlRedirects = z
  .object({
    redirects: z
      .array(Redirect)
      .max(20000)
      .refine(
        (rows) =>
          new Set(rows.map((r) => r.source_path.toLowerCase())).size ===
          rows.length,
        { message: "A source appears twice (case-insensitively)" },
      )
      .refine(
        (rows) => {
          const sources = new Set(rows.map((r) => r.source_path.toLowerCase()));
          return rows.every(
            (r) =>
              r.status === GONE ||
              !sources.has(r.destination_path.toLowerCase()),
          );
        },
        { message: "A destination is also a source (chain)" },
      ),
  })
  .strict();

export type AdminPutUrlRedirectsType = z.infer<typeof AdminPutUrlRedirects>;
