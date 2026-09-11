"use client";

import { useState } from "react";

import type { MedusaImage } from "@/lib/medusa";

export function ProductGallery({
  images,
  title,
  living,
}: {
  images: MedusaImage[];
  title: string;
  living: boolean;
}) {
  const usableImages = images.filter((image) => image.url);
  const [active, setActive] = useState(0);
  const selected = usableImages[active];

  return (
    <div className={`product-gallery ${living ? "living" : "equipment"}`}>
      <div className="gallery-main">
        {selected ? (
          // The product image source is managed by Medusa.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={selected.url} alt={title} />
        ) : (
          <span>Termékkép hamarosan</span>
        )}
      </div>
      {usableImages.length > 1 && (
        <div className="gallery-thumbs" aria-label="További termékképek">
          {usableImages.map((image, index) => (
            <button
              className={index === active ? "selected" : ""}
              key={image.id ?? image.url}
              onClick={() => setActive(index)}
              type="button"
              aria-label={`${title} – ${index + 1}. kép`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={image.url} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
