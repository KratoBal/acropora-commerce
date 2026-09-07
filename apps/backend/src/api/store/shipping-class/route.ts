import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http";
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils";

import { resolveCartShippingClass } from "../../../workflows/utils/resolve-cart-shipping-class";

/**
 * Which shipping class a cart falls into, and WHICH LINE decided it.
 *
 * The backend is the source of truth: the storefront asks, it does not decide.
 * Same shape as `store/payment-options`, deliberately -- this is a second
 * instance of an existing pattern, not a new one.
 *
 * === WHY THIS ROUTE EXISTS AT ALL ===
 *
 * `shipping_class_source` already exists, and its own comment says why: "it
 * exists so the storefront can say WHY an option disappeared". Until now
 * nothing could read it. The two hooks inject the class into the shipping
 * option RULE CONTEXT, which decides which options come back -- the storefront
 * sees the RESULT of that decision, never its reason.
 *
 * Without the reason a cart page can only infer ("only pickup came back, so it
 * must be pickup-only"), and an inference cannot name the item that caused it.
 * Naming the item is not decoration: a band that says "because of one of your
 * items" is as useless to a buyer as saying nothing, only more confident.
 *
 * === WHY NOT EXTEND THE MEDUSA RESPONSE ===
 *
 * `/store/shipping-options` is a core route. Decorating its response would put
 * our field inside something a Medusa upgrade owns; a route of our own does
 * not touch the core at all. Measured before writing: nothing in the core
 * response carries the class today.
 *
 * === WHAT IS AND IS NOT RETURNED ===
 *
 * Two fields, and no more. The SOURCE is a line item id, not a product name or
 * a title: the storefront already holds the cart and can resolve the name
 * itself. Sending more would be sending more than the naming needs.
 */
export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const { cart_id } = req.validatedQuery as { cart_id: string };

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY);

  const { data: carts } = await query.graph({
    entity: "cart",
    filters: { id: cart_id },
    /**
     * Exactly the fields `resolveCartShippingClass` reads off a line, no more:
     * `variant_id` is the anchor it looks everything else up from, and
     * `requires_shipping` decides whether the line counts at all.
     */
    fields: ["id", "items.id", "items.variant_id", "items.requires_shipping"],
  });

  const cart = carts?.[0];

  if (!cart) {
    throw new MedusaError(
      MedusaError.Types.NOT_FOUND,
      `Cart with id ${cart_id} was not found`,
    );
  }

  /**
   * A NARROWING RATHER THAN A CAST, and the difference matters.
   *
   * `query.graph` types the lines as `Maybe<LineItem>[]`, the resolver reads a
   * three-field shape. A cast would silence the compiler and hide which fields
   * actually cross this boundary; mapping them out states it, and a later
   * change to either side becomes a type error instead of a surprise.
   */
  const lines = (cart.items ?? [])
    .filter((item): item is NonNullable<typeof item> => Boolean(item))
    .map((item) => ({
      id: item.id,
      variant_id: item.variant_id,
      requires_shipping: item.requires_shipping,
    }));

  const { shipping_class, shipping_class_source } =
    await resolveCartShippingClass({ items: lines }, req.scope);

  res.json({ shipping_class, shipping_class_source });
};
