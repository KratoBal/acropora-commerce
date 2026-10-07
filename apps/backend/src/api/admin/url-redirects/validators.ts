import { z } from "@medusajs/framework/zod";

/** A path: starts with `/`, no whitespace or control character, no query. */
const PATH = z
  .string()
  .min(1)
  .max(2048)
  .regex(/^\/[^\s?#\u0000-\u001f\u007f]*$/, "a path without query or space");

const Redirect = z
  .object({
    source_path: PATH,
    destination_path: PATH,
    status: z.literal(301),
  })
  .strict();

/**
 * THE WHOLE LIST (SEO P0 PR 7a). The OS keeps two rules, and this is the second
 * gate on both, so a hand-written or broken payload cannot reach the shop:
 * - a source appears once, case-insensitively (the lookup is lowercase);
 * - no destination is a source (no chain): the shop follows one hop. A rule
 *   pointing to itself is the shortest chain, so the same check refuses it.
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
            (r) => !sources.has(r.destination_path.toLowerCase()),
          );
        },
        { message: "A destination is also a source (chain)" },
      ),
  })
  .strict();

export type AdminPutUrlRedirectsType = z.infer<typeof AdminPutUrlRedirects>;
