import Link from "next/link";

export default function CartPage() {
  return (
    <section className="cart-page">
      <span className="eyebrow">Medusa staging</span>
      <h1>Tesztkosár</h1>
      <p>
        A termékoldalról ide érkezik a külön storefront saját, elkülönített
        kosara. A teljes checkoutot csak külön staging fizetési szolgáltatóval
        szabad bekapcsolni.
      </p>
      <Link className="back-link" href="/hu">
        Vissza a katalógushoz
      </Link>
    </section>
  );
}
