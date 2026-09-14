import { deleteLineItem } from "@lib/data/cart"
import { Spinner, Trash } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { useState } from "react"

/**
 * A JELOLO ATVETELE NEM DISZ: NELKULE CSENDBEN NEM LETEZIK.
 *
 * A hivo (`cart/components/item`) MAR MA is atad egy
 * `data-testid="product-delete-button"` erteket -- a komponens viszont nem
 * vette at, tehat a jelolo a kiszolgalt lapon NEM allt ott. Merve 2026-09-14 a
 * kosar lapjan: a talalhato jelolok `cart-item-count` es `product-row`, torlo
 * gomb nincs kozottuk.
 *
 * ES A FORDITO NEM SZOLT ROLA. Egy ismeretlen prop egy sajat komponensen
 * normalisan tipushiba -- a KOTOJELES JSX-attributumot viszont a TypeScript
 * atengedi (nem ervenyes azonosito, tehat kimarad a tobblet-prop
 * ellenorzesbol). Vagyis a hibanak se forditasi, se futasi jele nem volt: a
 * hivo azt hitte, van merohelye, es nem volt.
 */
const DeleteButton = ({
  id,
  children,
  className,
  "data-testid": dataTestid,
}: {
  id: string
  children?: React.ReactNode
  className?: string
  "data-testid"?: string
}) => {
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async (id: string) => {
    setIsDeleting(true)
    await deleteLineItem(id).catch((_err) => {
      setIsDeleting(false)
    })
  }

  return (
    <div
      className={clx(
        "flex items-center justify-between text-small-regular",
        className,
      )}
    >
      <button
        className="flex gap-x-1 text-ui-fg-subtle hover:text-ui-fg-base cursor-pointer"
        onClick={() => handleDelete(id)}
        data-testid={dataTestid}
      >
        {isDeleting ? <Spinner className="animate-spin" /> : <Trash />}
        <span>{children}</span>
      </button>
    </div>
  )
}

export default DeleteButton
