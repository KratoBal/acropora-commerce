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
      <section className="intro-section">
        <span className="eyebrow">A TE REEFED. A MI SZAKÉRTELMÜNK.</span>
        <h1>Minden a következő jó döntéshez.</h1>
        <p>Technika, élőlények és a tudás, hogy jól válassz.</p>
      </section>
      <section className="category-shortcuts" aria-label="Kiemelt kategóriák">
        {[
          ["◌", "Világítás"],
          ["✤", "Szivattyúk"],
          ["▽", "Szűrés"],
          ["♧", "Vízkémia"],
          ["◔", "Eleség"],
          ["♢", "Élőlények"],
          ["▱", "Akváriumok"],
          ["☷", "Minden termék"],
        ].map(([icon, label]) => (
          <a href="#friss-erkezesek" key={label}>
            <span aria-hidden="true">{icon}</span>
            {label}
          </a>
        ))}
      </section>
      <section className="home-feature-grid">
        <div className="reef-feature">
          <div>
            <span className="eyebrow">EGY ÉLŐ VILÁG, OTTHON.</span>
            <h2>A reefed következő fejezete itt kezdődik.</h2>
            <p>Az első akváriumtól a legszebb korallodig.</p>
            <a href="#friss-erkezesek">Fedezd fel az élőlényeket　→</a>
          </div>
        </div>
        <aside className="knowledge-feature" id="tudastar">
          <span className="eyebrow">▱ ACROPORA TUDÁSTÁR</span>
          <h2>
            Előbb megértjük.
            <br />
            Aztán választunk.
          </h2>
          <p>Új akváriumot indítasz, vagy a meglévőből hoznál ki többet?</p>
          <a href="#tudastar">Indulj a tudással　→</a>
          <div>
            <span>Most indítom az első reefemet　›</span>
            <span>Stabilabb vízértékeket szeretnék　›</span>
          </div>
        </aside>
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
