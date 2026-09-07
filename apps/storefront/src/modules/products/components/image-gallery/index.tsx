import { HttpTypes } from "@medusajs/types"
import { Container } from "@modules/common/components/ui"
import Image from "next/image"

import UniquePieceBadge from "@modules/products/components/unique-piece-badge"

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /**
   * EGY DARAB, EZ A KONKRÉT PÉLDÁNY -- A KÉPEN.
   *
   * A jelvény CSAK az első képre kerül. Minden képre kitéve nem ígéret lenne,
   * hanem díszítés, és a lefelé görgető vevő ugyanazt olvasná ötször.
   */
  uniquePiece?: boolean
}

const ImageGallery = ({ images, uniquePiece = false }: ImageGalleryProps) => {
  return (
    <div className="flex items-start relative">
      <div className="flex flex-col flex-1 small:mx-16 gap-y-4">
        {images.map((image, index) => {
          return (
            <Container
              key={image.id}
              className="relative aspect-[29/34] w-full overflow-hidden bg-ui-bg-subtle"
              id={image.id}
            >
              {uniquePiece && index === 0 && <UniquePieceBadge />}
              {!!image.url && (
                <Image
                  src={image.url}
                  priority={index <= 2 ? true : false}
                  className="absolute inset-0 rounded-rounded"
                  alt={`Product image ${index + 1}`}
                  fill
                  sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
                  style={{
                    objectFit: "cover",
                  }}
                />
              )}
            </Container>
          )
        })}
      </div>
    </div>
  )
}

export default ImageGallery
