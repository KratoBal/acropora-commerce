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
  /*
    A PRICE LIST CHANGED (card 54bb3779): a sale price list is created, moved or removed. Its prices are price rows, so
    most of this also fires the `price` events above; the list's own events cover a window moved or a status switched,
    which touch no price row. THE START AND THE END OF A WINDOW FIRE NOTHING: Medusa switches by the clock. That is the
    boundary job's work (`jobs/price-list-boundary-revalidate.ts`).
  */
  "pricing.price-list.created",
  "pricing.price-list.updated",
  "pricing.price-list.deleted",
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

/**
 * Off (null) without both: the address to call and the shared secret.
 *
 * THE ADDRESS IS `STOREFRONT_REVALIDATE_URL` WHEN SET, ELSE `ACROPORA_STOREFRONT_URL` (card 54bb3779, acrobot). Two
 * addresses because the storefront has two meanings here. `ACROPORA_STOREFRONT_URL` is the shop's PUBLIC address: the
 * legal gate reads the mode from its host, the Google Merchant feed and the payment and order links point to it. The
 * test shop's public address sits behind Basic authentication (Traefik), which stops this call with a 401 before the app
 * sees it (measured 2026-11-19: no cache was ever emptied). The call may therefore go to an internal address (the
 * storefront's name on the Coolify network) without changing any of those links. Production needs no second address.
 */
export const storefrontRevalidateConfig = (
  env: NodeJS.ProcessEnv,
): StorefrontRevalidateConfig | null => {
  const base = (
    env.STOREFRONT_REVALIDATE_URL?.trim() ||
    env.ACROPORA_STOREFRONT_URL?.trim() ||
    ""
  ).replace(/\/+$/, "");
  const secret = env.STOREFRONT_REVALIDATE_SECRET?.trim() ?? "";
  return base && secret ? { url: `${base}/api/revalidate`, secret } : null;
};

type Logger = { info(message: string): void; warn(message: string): void };

/**
 * THE REVALIDATION MADE MEASURABLE (card 54bb3779, A4 on the test shop, 2026-11-19). A call that fails is only logged, and the
 * test shop's run log cannot be read from outside, so "the cache did not empty" had three possible causes with no way to tell them
 * apart: no event reached the subscriber, the call failed (a name that does not resolve, a wrong secret), or it succeeded and the
 * storefront did not empty. The process keeps the last REQUEST (an event reached a subscriber) and the last ATTEMPT (a call went
 * out, with its outcome: the HTTP status, or the error and its cause code). In memory only: a restart forgets them, and a table
 * is not worth a diagnostic. The secret never enters it.
 */
export type RevalidateRequest = { at: string; source: string; configured: boolean };
export type RevalidateAttempt = {
  at: string;
  trigger: string;
  tags: string[];
  ok: boolean;
  http_status: number | null;
  error: string | null;
};

const memory: { lastRequest: RevalidateRequest | null; lastAttempt: RevalidateAttempt | null } = {
  lastRequest: null,
  lastAttempt: null,
};

/** A subscriber received an event that asks for a revalidation (before the window, and whether or not it is configured). */
export const noteRevalidateRequest = (
  source: string,
  env: NodeJS.ProcessEnv = process.env,
  now: Date = new Date(),
): void => {
  memory.lastRequest = { at: now.toISOString(), source, configured: storefrontRevalidateConfig(env) !== null };
};

/** Test seam: the memory is the process's. */
export const resetRevalidateMemory = (): void => {
  memory.lastRequest = null;
  memory.lastAttempt = null;
};

const describeError = (error: unknown, secret: string): string => {
  const base = error instanceof Error ? error.message : String(error);
  const cause = (error as { cause?: { code?: unknown; message?: unknown } } | null)?.cause;
  const detail = typeof cause?.code === "string" ? cause.code : typeof cause?.message === "string" ? cause.message : "";
  const text = detail ? `${base} (${detail})` : base;
  // a secret never leaves in an error text, whatever put it there; and an address inside it is cut to scheme and host: undici's
  // own TypeError for an address with credentials names the WHOLE address, password included
  const withoutSecret = secret ? text.split(secret).join("***") : text;
  return withoutSecret.replace(/(https?:\/\/)(?:[^\s/@]*@)?([^\s/?#]+)[^\s]*/gi, "$1$2").slice(0, 300);
};

/**
 * WHAT THE ADMIN READS: whether the revalidation is switched on, which variable gave the address, the target's HOST (never its
 * path, never the secret), and the two memories. `secret_set` says only that the secret exists.
 */
export const storefrontRevalidateStatus = (env: NodeJS.ProcessEnv = process.env) => {
  const own = env.STOREFRONT_REVALIDATE_URL?.trim() ?? "";
  const publicUrl = env.ACROPORA_STOREFRONT_URL?.trim() ?? "";
  const base = own || publicUrl;
  let host: string | null = null;
  try {
    host = base ? new URL(base).host : null;
  } catch {
    host = null;
  }
  return {
    configured: storefrontRevalidateConfig(env) !== null,
    url_source: own ? "STOREFRONT_REVALIDATE_URL" : publicUrl ? "ACROPORA_STOREFRONT_URL" : null,
    target_host: host,
    secret_set: Boolean(env.STOREFRONT_REVALIDATE_SECRET?.trim()),
    last_request: memory.lastRequest,
    last_attempt: memory.lastAttempt,
  };
};

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
  trigger: string = "unknown",
): Promise<boolean> {
  const attempt = (ok: boolean, httpStatus: number | null, error: string | null) => {
    memory.lastAttempt = { at: new Date().toISOString(), trigger, tags: [...tags], ok, http_status: httpStatus, error };
    return ok;
  };
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
      return attempt(false, response.status, null);
    }
    logger.info(`Storefront cache emptied (${tags.join(", ")}).`);
    return attempt(true, response.status, null);
  } catch (error) {
    const text = describeError(error, config.secret);
    logger.warn(`Storefront revalidate (${tags.join(", ")}) failed: ${text}.`);
    return attempt(false, null, text);
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
