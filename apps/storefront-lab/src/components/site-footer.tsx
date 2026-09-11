import Link from "next/link";

const shop = "https://shop.acropora.hu";

function ShopLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <a href={shop + href} rel="noreferrer" target="_blank">
      {children} ↗
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="store-footer">
      <section className="footer-newsletter">
        <div>
          <span className="eyebrow">ACROPORA HÍRLEVÉL</span>
          <h2>Maradj képben a reef világával.</h2>
          <p>Újdonságok, érkező termékek és ajánlatok a postaládádban.</p>
        </div>
        <a
          className="footer-cta"
          href={shop + "/#newsletter"}
          rel="noreferrer"
          target="_blank"
        >
          Feliratkozás a webshopban ↗
        </a>
      </section>
      <div className="footer-grid">
        <section className="footer-contact">
          <h2>Acropora Kft.</h2>
          <address>
            1106 Budapest,
            <br />
            Pesti Gábor utca 35.
            <br />
            <a href="tel:+36202676801">+36 20 267 6801</a>
            <br />
            <a href="mailto:webshop@acropora.hu">webshop@acropora.hu</a>
          </address>
          <p className="opening-hours">
            <strong>Nyitvatartás</strong>
            <br />
            Kedd–péntek: 10:00–18:00
            <br />
            Szombat: 10:00–14:00
            <br />
            Vasárnap–hétfő: zárva
          </p>
        </section>
        <nav>
          <h2>Oldaltérkép</h2>
          <Link href="/hu">Nyitóoldal</Link>
          <a href="#friss-erkezesek">Termékek</a>
          <a href="#friss-erkezesek">Halak</a>
          <a href="#friss-erkezesek">Korallok</a>
          <a href="#friss-erkezesek">Gerinctelenek</a>
          <a href="#tudastar">Tudástár</a>
          <a href="#services">ICP & szerviz</a>
        </nav>
        <nav>
          <h2>Vásárlói fiók</h2>
          <ShopLink href="/shop_order_track.php">Belépés / Profilom</ShopLink>
          <ShopLink href="/shop_reg.php">Regisztráció</ShopLink>
          <ShopLink href="/shop_cart.php">Kosár</ShopLink>
          <ShopLink href="/shop_order_track.php?tab=favourites">
            Kedvenceim
          </ShopLink>
          <p className="footer-note">
            A fióklinkek a jelenlegi webshopban, új lapon nyílnak meg.
          </p>
        </nav>
        <nav>
          <h2>Információk</h2>
          <ShopLink href="/shop_help.php?tab=terms">
            Általános szerződési feltételek
          </ShopLink>
          <ShopLink href="/shop_help.php?tab=privacy_policy">
            Adatkezelési tájékoztató
          </ShopLink>
          <ShopLink href="/shop_contact.php?tab=payment">Fizetés</ShopLink>
          <ShopLink href="/shop_contact.php?tab=shipping">Szállítás</ShopLink>
          <ShopLink href="/shop_contact.php">Elérhetőségek</ShopLink>
          <ShopLink href="/fogyaszto-barat">
            Képes vásárlói tájékoztató
          </ShopLink>
        </nav>
      </div>
      <section className="footer-payments">
        <div>
          <h2>Fizetési lehetőségek</h2>
          <a
            className="simplepay-card"
            href="https://simplepartner.hu/PaymentService/Fizetesi_tajekoztato.pdf"
            rel="noreferrer"
            target="_blank"
          >
            <b>SimplePay</b>
            <span>Google Pay · Apple Pay · Mastercard · Maestro · Visa</span>
          </a>
          <ShopLink href="/shop_contact.php?tab=payment">
            Fizetési tájékoztató
          </ShopLink>
        </div>
        <ul>
          <li>
            <strong>Online bankkártyával</strong>
            <span>SimplePay</span>
          </li>
          <li>
            <strong>Üzletünkben</strong>
            <span>Készpénzzel vagy bankkártyával</span>
          </li>
          <li>
            <strong>GLS átvételnél</strong>
            <span>Futárnál vagy csomagponton utánvéttel</span>
          </li>
          <li>
            <strong>Foxpost automatánál</strong>
            <span>Bankkártyával</span>
          </li>
        </ul>
      </section>
      <div className="footer-bottom">
        <span>© 2026 Acropora Kft.</span>
        <span>Medusa storefront lab · tesztkörnyezet</span>
        <Link href="/hu">Vissza a kezdőlapra →</Link>
      </div>
    </footer>
  );
}
