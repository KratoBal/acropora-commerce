/**
 * THE STOREFRONT'S CACHE, EMPTIED WHEN A PRICE CHANGES (card 2d22116c;
 * Balázs 2026-10-06 22:05 UTC, „Mehet a 2,7,6,8”, test storefront only).
 *
 * The storefront fetches products with `force-cache`, so a buyer saw an old
 * price until the next deploy. Measured on 2026-10-07 with nautilus: prices
 * are written through the variant's admin route by the OS price projection,
 * and that write ends in the pricing module, whose MedusaService emits
 * `pricing.price.created|updated|deleted` for every ORM change (2.20.1,
 * `interceptEntityMutationEvents`). So the signal is Medusa's own event,
 * whatever path wrote the price.
 *
 * One price write is one event, and a projection run writes hundreds. The
 * calls are coalesced: the first event starts a short window, and the window
 * ends in ONE call. A failed call is logged and never thrown: a cache that
 * stays stale until the next change is better than a price write that fails.
 */
export const PRICE_CHANGE_EVENTS = [
  "pricing.price.created",
  "pricing.price.updated",
  "pricing.price.deleted",
] as const;

/**
 * A stock change (FE-7 part 3, Balázs 2026-10-07 07:44 UTC: the public pages
 * are cached, so a sold-out product must not stay "in stock" on a cached
 * page). The storefront's availability comes from the inventory levels:
 * `stocked_quantity` from the OS stock projection, `reserved_quantity` from
 * every reservation (the inventory module adjusts it through the same level
 * service, 2.20.1 `inventory-module.js`). Every ORM change of a level emits
 * `inventory.inventory-level.created|updated|deleted` (`InventoryEvents`,
 * built from `inventoryLevel` and `Modules.INVENTORY`).
 */
export const INVENTORY_CHANGE_EVENTS = [
  "inventory.inventory-level.created",
  "inventory.inventory-level.updated",
  "inventory.inventory-level.deleted",
] as const;

/**
 * A product or one of its variants changed (SEO P0 PR 7d stage measurement,
 * 2026-10-08). The storefront caches the product lookup under the `products`
 * tag with no expiry, and only price and stock events emptied it. So a new
 * handle, title or description reached the shop only with the next price or
 * stock change. Measured on the test shop: after the handle switch, a handle
 * looked up before the switch kept its empty result, and its page stayed 404
 * while the product was published under that handle.
 *
 * The names are the product workflows' own: the admin product and variant
 * routes run `updateProductsWorkflow` / `updateProductVariantsWorkflow`, which
 * emit these (2.20.1, `core-flows/dist/product/workflows`).
 */
export const PRODUCT_CHANGE_EVENTS = [
  "product.created",
  "product.updated",
  "product.deleted",
  "product-variant.created",
  "product-variant.updated",
  "product-variant.deleted",
] as const

export type StorefrontRevalidateConfig = { url: string; secret: string };

/** Off (null) without both: the storefront's address and the shared secret. */
export const storefrontRevalidateConfig = (
  env: NodeJS.ProcessEnv,
): StorefrontRevalidateConfig | null => {
  const base = env.ACROPORA_STOREFRONT_URL?.trim().replace(/\/+$/, "") ?? "";
  const secret = env.STOREFRONT_REVALIDATE_SECRET?.trim() ?? "";
  return base && secret ? { url: `${base}/api/revalidate`, secret } : null;
};

type Logger = { info(message: string): void; warn(message: string): void };

/**
 * `tags`: what to empty. `products` by default (prices, stock); the redirect
 * list's route sends `redirects` (SEO P0 PR 7a), which the storefront accepts
 * from PR 7c on (until then it answers 400, and the call is only logged).
 */
export async function sendStorefrontRevalidate(
  config: StorefrontRevalidateConfig,
  logger: Logger,
  fetchImpl: typeof fetch = fetch,
  tags: readonly string[] = ["products"],
): Promise<boolean> {
  try {
    const response = await fetchImpl(config.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-revalidate-secret": config.secret,
      },
      body: JSON.stringify({ tags }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) {
      logger.warn(
        `Storefront revalidate (${tags.join(", ")}) failed: HTTP ${response.status}.`,
      );
      return false;
    }
    logger.info(`Storefront cache emptied (${tags.join(", ")}).`);
    return true;
  } catch (error) {
    logger.warn(
      `Storefront revalidate (${tags.join(", ")}) failed: ${
        error instanceof Error ? error.message : String(error)
      }.`,
    );
    return false;
  }
}

/**
 * One call per window. `request()` is cheap and synchronous: the subscriber
 * calls it for every event, and only the first in a window starts a timer.
 */
export function revalidateCoalescer(
  send: () => Promise<unknown>,
  windowMs: number,
  timer: (run: () => void, ms: number) => unknown = (run, ms) =>
    setTimeout(run, ms),
) {
  let pending = false;
  return {
    request(): void {
      if (pending) return;
      pending = true;
      timer(() => {
        pending = false;
        void send();
      }, windowMs);
    },
  };
}
