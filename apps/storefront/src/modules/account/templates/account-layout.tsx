import React from "react"

import { HttpTypes } from "@medusajs/types"

import { FiokKeret } from "../components/fiok-menu"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
}

/**
 * A BEJELENTKEZETT FIOK KERETE (P5, 257:3; mobilon 257:212). Csak
 * bejelentkezett vevonek all (a fiok layoutja dont); a rendeles reszletei
 * sajat keretben jelennek meg (`FiokKeret`).
 *
 * Fej ("FIÓKOM" es a lap cime), alatta a 244 px-es menu es a tartalom, 28 px
 * kozzel. Mobilon a menu fulsor a cim alatt. A regi "Kérdésed van?" sav
 * kimaradt: a keretben nincs, es egy nem letezo ugyfelszolgalati lapra vitt.
 */
const AccountLayout: React.FC<AccountLayoutProps> = ({ children }) => {
  return (
    <div className="bg-acr-shell font-acr-sans" data-testid="account-page">
      <div className="mx-auto flex max-w-[1440px] flex-col gap-3 px-4 pb-16 pt-[18px] small:gap-0 small:px-[56px] small:pt-[30px]">
        <FiokKeret>{children}</FiokKeret>
      </div>
    </div>
  )
}

export default AccountLayout
