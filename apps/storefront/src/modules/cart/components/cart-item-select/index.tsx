"use client"

import { SelectHTMLAttributes, forwardRef } from "react"

import ChevronDown from "@modules/common/icons/chevron-down"

/**
 * A MENNYISÉG-VÁLASZTÓ A KOSÁRSORBAN: natív `select`, a kategórialap
 * keretével. Minden tulajdonság (`value`, `onChange`, `data-testid`,
 * `aria-label`) a `select` elemre kerül, mert a tesztek és a böngésző is azt
 * éri el.
 */
const CartItemSelect = forwardRef<
  HTMLSelectElement,
  Omit<SelectHTMLAttributes<HTMLSelectElement>, "size">
>(({ className, children, ...props }, ref) => (
  <div className="relative flex w-[76px] items-center">
    <select
      ref={ref}
      {...props}
      className={
        "h-[44px] w-full cursor-pointer appearance-none border border-acr-line bg-acr-white pl-3 pr-8 text-[14px] text-acr-ink outline-none hover:border-acr-slate focus-visible:border-acr-ink " +
        (className ?? "")
      }
    >
      {children}
    </select>
    <span className="pointer-events-none absolute right-2 flex text-acr-slate">
      <ChevronDown />
    </span>
  </div>
))
CartItemSelect.displayName = "CartItemSelect"

export default CartItemSelect
