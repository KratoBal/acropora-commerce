import Link from "next/link";

import type { MedusaCategory } from "@/lib/medusa";

const navigation = ["Termékek", "Halak", "Korallok", "Gerinctelenek"];

export function SiteHeader({ categories }: { categories: MedusaCategory[] }) {
  const roots = categories.filter((category) => !category.parent_category_id);

  return (
    <header className="site-header">
      <div className="utility-bar">
        <span>Acropora OS · Medusa storefront lab</span>
        <span>Élő állatok biztonságos szállítása</span>
      </div>
      <div className="header-main">
        <Link className="brand" href="/hu" aria-label="Acropora kezdőlap">
          <span className="brand-mark" aria-hidden="true">
            <i />
          </span>
          <span>acropora</span>
        </Link>
        <label className="search">
          <span className="sr-only">Keresés</span>
          <input placeholder="Keress terméket, halat vagy korallt…" />
          <span aria-hidden="true">⌕</span>
        </label>
        <Link className="cart-link" href="/hu/kosar">
          Kosár <span aria-hidden="true">→</span>
        </Link>
      </div>
      <nav className="product-navigation" aria-label="Termékkategóriák">
        {navigation.map((name) => {
          const matching = roots.filter((category) =>
            name === "Termékek"
              ? true
              : category.name
                  .toLocaleLowerCase("hu")
                  .includes(name.slice(0, -1).toLocaleLowerCase("hu")),
          );
          const items = matching.length ? matching : roots;

          return (
            <div className="menu" key={name}>
              <button type="button">
                {name} <span aria-hidden="true">⌄</span>
              </button>
              <div className="menu-panel">
                {items.slice(0, 8).map((category) => (
                  <Link
                    href={`/hu?category=${category.handle}`}
                    key={category.id}
                  >
                    {category.name}
                  </Link>
                ))}
              </div>
            </div>
          );
        })}
      </nav>
    </header>
  );
}
