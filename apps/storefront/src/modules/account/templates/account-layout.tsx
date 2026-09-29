import React from "react"

import { HttpTypes } from "@medusajs/types"

import FiokMenu, { FiokFej } from "../components/fiok-menu"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

/**
 * A BEJELENTKEZETT FIOK KERETE (P5, 257:3; mobilon 257:212).
 *
 * Fej ("FIÓKOM" es a lap cime), alatta a 244 px-es menu es a tartalom, 28 px
 * kozzel. Mobilon a menu fulsor a cim alatt. A regi "Kérdésed van?" sav
 * kimaradt: a keretben nincs, es egy nem letezo ugyfelszolgalati lapra vitt.
 */
const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
}) => {
  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="account-page">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-16 pt-[18px] small:gap-0 small:px-[56px] small:pt-[30px]">
        <div className="small:pb-[20px]">
          <FiokFej />
        </div>
        <div className="flex flex-col gap-3 small:grid small:grid-cols-[244px_minmax(0,1fr)] small:gap-7">
          <div>{customer && <FiokMenu />}</div>
          <div className="min-w-0">{children}</div>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
