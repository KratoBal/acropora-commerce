import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getRegion, storeFetch } from "@/lib/medusa";

const cookieName = "acropora_storefront_lab_cart";

type CartResponse = {
  cart: {
    id: string;
  };
};

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      variantId?: string;
      quantity?: number;
      countryCode?: string;
    };
    if (!body.variantId) {
      return NextResponse.json(
        { error: "Hiányzó termékváltozat." },
        { status: 400 },
      );
    }

    const cookieStore = await cookies();
    let cartId = cookieStore.get(cookieName)?.value;

    if (!cartId) {
      const region = await getRegion(body.countryCode ?? "hu");
      if (!region) {
        return NextResponse.json(
          { error: "Nincs beállított Medusa régió." },
          { status: 422 },
        );
      }
      const created = await storeFetch<CartResponse>("/store/carts", {
        method: "POST",
        body: JSON.stringify({ region_id: region.id }),
      });
      cartId = created.cart.id;
    }

    const updated = await storeFetch<CartResponse>(
      "/store/carts/" + cartId + "/line-items",
      {
        method: "POST",
        body: JSON.stringify({
          variant_id: body.variantId,
          quantity: Math.max(1, Number(body.quantity) || 1),
        }),
      },
    );

    const response = NextResponse.json({ cart: updated.cart });
    response.cookies.set(cookieName, updated.cart.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
    return response;
  } catch {
    return NextResponse.json(
      { error: "A Medusa kosár nem frissíthető." },
      { status: 502 },
    );
  }
}
