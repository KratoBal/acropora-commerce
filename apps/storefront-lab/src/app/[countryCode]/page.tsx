import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { listProducts } from "@/lib/medusa";

export default async function StorefrontLabHome({
  params,
}: {
  params: Promise<{ countryCode: string }>;
}) {
  const { countryCode } = await params;
  let products: Awaited<ReturnType<typeof listProducts>>["products"] = [];
  let unavailable = false;

  try {
    products = (await listProducts(countryCode, 12)).products;
  } catch {
    unavailable = true;
  }

  return (
    <>
      <section className="hero">
        <div className="hero-copy">
          <span className="eyebrow">Acropora OS · Storefront Lab</span>
          <h1>A zátony minden részlete számít.</h1>
          <p>
            Különálló, Medusa-alapú teszt storefront az Acropora új vásárlási
            élményéhez.
          </p>
          <div className="hero-actions">
            <a href="#friss-erkezesek">Friss érkezések</a>
            <Link href="/hu/kosar">Tesztkosár megnyitása</Link>
          </div>
        </div>
        <div className="hero-water" aria-hidden="true">
          <span className="coral-orb one" />
          <span className="coral-orb two" />
          <span className="coral-orb three" />
        </div>
      </section>
      <section className="service-strip">
        <div>
          <strong>WYSIWYG élőlények</strong>
          <span>A kiválasztott egyedet kapod</span>
        </div>
        <div>
          <strong>Szakértői segítség</strong>
          <span>Akvarista szemlélet minden döntéshez</span>
        </div>
        <div>
          <strong>Biztonságos szállítás</strong>
          <span>Élő állatokra tervezett folyamat</span>
        </div>
      </section>
      <section className="catalog-section" id="friss-erkezesek">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Medusa katalógus</span>
            <h2>Friss érkezések</h2>
          </div>
          <span>{products.length ? products.length + " termék" : ""}</span>
        </div>
        {unavailable ? (
          <div className="connection-state">
            A Medusa staging kapcsolat jelenleg nem elérhető. A storefront
            felépítése készen áll, a termékek a kapcsolat helyreállásakor
            automatikusan megjelennek.
          </div>
        ) : products.length ? (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        ) : (
          <div className="connection-state">
            Ebben a régióban még nincs megjeleníthető termék.
          </div>
        )}
      </section>
    </>
  );
}
