import Link from "next/link";

import { AcroporaLogo } from "@/components/acropora-logo";
import type { MedusaCategory } from "@/lib/medusa";

const navigation = ["Termékek", "Halak", "Korallok", "Gerinctelenek"];

export function SiteHeader({ categories }: { categories: MedusaCategory[] }) {
  const roots = categories.filter((category) => !category.parent_category_id);

  return (
    <header className="site-header">
      <div className="prototype-bar">
        <span>● KEZDŐOLDALTERV · Medusa staging adatokkal</span>
        <span className="prototype-links">
          Technika terméklap　 Korall　 Hal
        </span>
        <span>
          Nézet: <b>guest⌄</b>
        </span>
      </div>
      <div className="utility-bar">
        <span>Tengeri akvarisztika. Szakértőktől, akvaristáknak.</span>
        <span>Szakértői segítség　 Szállítás és átvétel　 HU / HUF</span>
      </div>
      <div className="header-main homepage-header">
        <Link className="brand" href="/hu" aria-label="Acropora kezdőlap">
          <AcroporaLogo className="header-logo" />
        </Link>
        <label className="search">
          <span className="sr-only">Keresés</span>
          <span aria-hidden="true">⌕</span>
          <input placeholder="Termék, márka vagy kérdés az akváriumodról…" />
          <span className="spark" aria-hidden="true">
            ✧
          </span>
        </label>
        <div className="header-actions">
          <button type="button" aria-label="Fiók">
            ♙
          </button>
          <button type="button" aria-label="Kedvencek">
            ♡
          </button>
          <Link aria-label="Kosár" href="/hu/kosar">
            ▢ <b>0</b>
          </Link>
        </div>
      </div>
      <div className="navigation-wrap">
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
                      href={"/hu?category=" + category.handle}
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
        <nav className="service-navigation" aria-label="Szolgáltatások">
          <a href="#brands">Márkák</a>
          <a href="#tudastar">Tudástár</a>
          <a href="#services">ICP & szerviz</a>
          <a href="#club">Reef Club</a>
        </nav>
        <div className="extra-links">
          <a href="#friss-erkezesek">Újdonságok</a>
          <a href="#friss-erkezesek">Akciók</a>
        </div>
      </div>
    </header>
  );
}
