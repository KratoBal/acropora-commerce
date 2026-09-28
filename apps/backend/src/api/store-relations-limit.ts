/**
 * HOW DEEP A STORE API REQUEST MAY EXPAND RELATIONS.
 *
 * Medusa 2.20.0 introduced a limit on the Store API (`http.storeRelationsLimit`),
 * defaulting to 3: `@medusajs/framework/dist/config/config.js`, and the check
 * in `http/utils/validate-query.js`. A request that expands deeper is rejected
 * with 400 INVALID_DATA - not trimmed, rejected.
 *
 * Our storefront asks for FIVE levels of parent category on the category page
 * (`apps/storefront/src/lib/data/categories.ts`, the breadcrumb chain), and it
 * does so at `next build` time as well, through `generateStaticParams`. Under
 * the default, the category pages and the storefront build would both break on
 * the upgrade from 2.19.0.
 *
 * WHY RAISE THE LIMIT RATHER THAN SHORTEN THE QUERY: the chain is the category
 * tree's real depth, and cutting it would drop the top of the breadcrumb on the
 * deepest categories without anything failing. The limit is a guard against
 * abusive expansions; five is still a bound.
 *
 * WHAT THIS DOES NOT LOOSEN: routes that declare their own limit keep it - the
 * route's `storeRelationsLimit` wins over this one (`validate-query.js`:
 * `queryConfig.storeRelationsLimit ?? req.storeRelationsLimit`). In 2.20.1 that
 * is carts 3, orders 3 and products 4.
 *
 * `__tests__/store-relations-limit.unit.spec.ts` measures the storefront's
 * deepest requested field against this number, so deepening a query without
 * raising the limit turns red here, not on a live category page.
 */
export const STORE_RELATIONS_LIMIT = 5
