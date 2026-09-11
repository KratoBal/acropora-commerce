import "server-only";

export type MedusaImage = {
  id?: string;
  url: string;
};

export type MedusaPrice = {
  calculated_amount?: number;
  original_amount?: number;
  currency_code?: string;
};

export type MedusaVariant = {
  id: string;
  title: string;
  inventory_quantity?: number;
  calculated_price?: MedusaPrice;
};

export type MedusaCategory = {
  id: string;
  name: string;
  handle: string;
  parent_category_id?: string | null;
  category_children?: MedusaCategory[];
};

export type MedusaProduct = {
  id: string;
  title: string;
  handle: string;
  subtitle?: string | null;
  description?: string | null;
  thumbnail?: string | null;
  images?: MedusaImage[];
  variants?: MedusaVariant[];
  categories?: MedusaCategory[];
  metadata?: Record<string, unknown> | null;
};

type Region = {
  id: string;
  countries?: Array<{ iso_2?: string }>;
};

const stagingBackendUrl = "https://commerce-stage.acropora.hu";
const stagingPublishableKey =
  "pk_ba7f178c2b6b94dc96334fc7f24d32c3949b4575fc764658812fcd508a8b7dcc";

const backendUrl = () => {
  const configuredUrl =
    process.env.MEDUSA_BACKEND_URL ??
    process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL;

  return (configuredUrl?.trim() || stagingBackendUrl).replace(/\/$/, "");
};

const publishableKey = () =>
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY?.trim() ||
  stagingPublishableKey;

const endpoint = (
  path: string,
  query?: Record<string, string | number | undefined>,
) => {
  const url = new URL(path, backendUrl());
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  return url.toString();
};

export async function storeFetch<T>(
  path: string,
  options: RequestInit = {},
  query?: Record<string, string | number | undefined>,
): Promise<T> {
  if (!backendUrl() || !publishableKey()) {
    throw new Error("A Medusa kapcsolat nincs beállítva.");
  }

  const response = await fetch(endpoint(path, query), {
    ...options,
    headers: {
      "content-type": "application/json",
      "x-publishable-api-key": publishableKey(),
      ...options.headers,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Medusa Store API hiba: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export async function getRegion(countryCode: string) {
  const { regions } = await storeFetch<{ regions: Region[] }>("/store/regions");
  return (
    regions.find((region) =>
      region.countries?.some(
        (country) => country.iso_2?.toLowerCase() === countryCode.toLowerCase(),
      ),
    ) ?? null
  );
}

const productFields =
  "*variants.calculated_price,+variants.inventory_quantity,+metadata,*images,*categories";

export async function listProducts(countryCode: string, limit = 12) {
  const region = await getRegion(countryCode);
  if (!region) return { products: [] as MedusaProduct[], count: 0 };

  return storeFetch<{ products: MedusaProduct[]; count: number }>(
    "/store/products",
    {},
    {
      limit,
      region_id: region.id,
      fields: productFields,
    },
  );
}

export async function getProduct(countryCode: string, handle: string) {
  const region = await getRegion(countryCode);
  if (!region) return null;

  const { products } = await storeFetch<{ products: MedusaProduct[] }>(
    "/store/products",
    {},
    {
      handle,
      region_id: region.id,
      limit: 1,
      fields: productFields,
    },
  );
  return products[0] ?? null;
}

export async function listCategories() {
  const { product_categories } = await storeFetch<{
    product_categories: MedusaCategory[];
  }>(
    "/store/product-categories",
    {},
    {
      limit: 100,
      fields: "id,name,handle,parent_category_id,*category_children",
    },
  );
  return product_categories;
}

export function isLivingProduct(product: MedusaProduct) {
  const searchable = [
    product.title,
    product.subtitle ?? "",
    ...(product.categories?.map((category) => category.name) ?? []),
  ]
    .join(" ")
    .toLocaleLowerCase("hu");

  return /korall|halak|hal |gerinctelen|euphyllia|acropora|zoanthus/.test(
    searchable,
  );
}

export function formatPrice(price?: MedusaPrice) {
  if (price?.calculated_amount === undefined) return "Érdeklődj az árról";

  return new Intl.NumberFormat("hu-HU", {
    style: "currency",
    currency: price.currency_code?.toUpperCase() ?? "HUF",
    maximumFractionDigits: 0,
  }).format(price.calculated_amount);
}
