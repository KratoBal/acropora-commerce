import Link from "next/link";

import { formatPrice, isLivingProduct, type MedusaProduct } from "@/lib/medusa";

export function ProductCard({ product }: { product: MedusaProduct }) {
  const living = isLivingProduct(product);
  const image = product.thumbnail ?? product.images?.[0]?.url;
  const price = product.variants?.[0]?.calculated_price;

  return (
    <article className={`product-card ${living ? "living" : "equipment"}`}>
      <Link href={`/hu/termek/${product.handle}`} className="product-image">
        {image ? (
          // Medusa product images may come from the configured object store.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt={product.title} />
        ) : (
          <span className="image-placeholder">Acropora</span>
        )}
        <span className="product-kind">
          {living ? "Élő állat" : "Felszerelés"}
        </span>
      </Link>
      <div className="product-card-copy">
        <Link href={`/hu/termek/${product.handle}`}>
          <h3>{product.title}</h3>
        </Link>
        <p>
          {product.subtitle ||
            product.categories?.[0]?.name ||
            "Tengeri akvarisztika"}
        </p>
        <strong>{formatPrice(price)}</strong>
      </div>
    </article>
  );
}
