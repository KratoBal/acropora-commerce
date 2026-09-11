import { notFound } from "next/navigation";

import { AddToCart } from "@/components/add-to-cart";
import { ProductGallery } from "@/components/product-gallery";
import {
  formatPrice,
  getProduct,
  isLivingProduct,
  type MedusaImage,
} from "@/lib/medusa";

export default async function ProductPage({
  params,
}: {
  params: Promise<{ countryCode: string; handle: string }>;
}) {
  const { countryCode, handle } = await params;
  let decodedHandle = handle;
  try {
    decodedHandle = decodeURIComponent(handle);
  } catch {
    // An invalid URL segment is treated as a product that cannot be found.
  }
  const product = await getProduct(countryCode, decodedHandle).catch(
    () => null,
  );
  if (!product) notFound();

  const living = isLivingProduct(product);
  const images: MedusaImage[] = product.images?.length
    ? product.images
    : product.thumbnail
      ? [{ url: product.thumbnail }]
      : [];
  const selectedVariant = product.variants?.[0];
  const soldOut =
    selectedVariant?.inventory_quantity !== undefined &&
    selectedVariant.inventory_quantity < 1;

  return (
    <article
      className={
        "product-page " + (living ? "living-product" : "equipment-product")
      }
    >
      <div className="breadcrumb">Kezdőlap / Termékek / {product.title}</div>
      <div className="product-layout">
        <ProductGallery images={images} title={product.title} living={living} />
        <div className="product-details">
          <span className="eyebrow">
            {living ? "Élőlény · WYSIWYG" : "Akvarisztikai felszerelés"}
          </span>
          <h1>{product.title}</h1>
          {product.subtitle && (
            <p className="product-subtitle">{product.subtitle}</p>
          )}
          <p className="product-price">
            {formatPrice(selectedVariant?.calculated_price)}
          </p>
          {living && (
            <div className="living-note">
              <strong>A képen látható egyed</strong>
              <span>
                A terméklap a kiválasztott korall vagy hal vizuális hangsúlyára
                épül.
              </span>
            </div>
          )}
          <div className="purchase-box">
            <div>
              <span>Elérhetőség</span>
              <strong>
                {soldOut
                  ? "Jelenleg nincs készleten"
                  : "Staging készlet szerint elérhető"}
              </strong>
            </div>
            <AddToCart variantId={selectedVariant?.id} disabled={soldOut} />
          </div>
          <dl className="product-facts">
            <div>
              <dt>Kategória</dt>
              <dd>{product.categories?.[0]?.name ?? "Tengeri akvarisztika"}</dd>
            </div>
            <div>
              <dt>Galéria</dt>
              <dd>{images.length} kép</dd>
            </div>
            <div>
              <dt>Termékazonosító</dt>
              <dd>{product.id}</dd>
            </div>
          </dl>
        </div>
      </div>
      <section className="product-description">
        <span className="eyebrow">Részletek</span>
        <h2>Termékinformációk</h2>
        <p>
          {product.description ||
            "A részletes termékleírás a Medusa katalógusból érkezik."}
        </p>
      </section>
    </article>
  );
}
