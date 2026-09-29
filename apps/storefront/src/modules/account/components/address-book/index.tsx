import React from "react"

import { HttpTypes } from "@medusajs/types"
import { rendezettCimek } from "@lib/util/cim"

import AddAddress from "../address-card/add-address"
import EditAddress from "../address-card/edit-address-modal"

type AddressBookProps = {
  customer: HttpTypes.StoreCustomer
  region: HttpTypes.StoreRegion
}

/**
 * A MENTETT CIMEK (P5, 257:82; mobilon 257:247).
 *
 * Asztalon felul a "Mentett szállítási címek" (600/20) es jobbra az "Új cím";
 * alatta a kartyak egymas alatt, 16 px kozzel, a tartalomhoz simulo
 * szelesseggel. Mobilon nincs fej-sor, az "Új cím" a lista alatt all, teljes
 * szelessegben. Az alapertelmezett cim elol all.
 */
const AddressBook: React.FC<AddressBookProps> = ({ customer, region }) => {
  const cimek = rendezettCimek(customer.addresses ?? [])
  return (
    <div
      className="flex flex-col gap-3 font-acr-sans small:gap-4"
      data-testid="address-book"
    >
      <div className="order-last flex items-center justify-between small:order-none">
        <h2 className="hidden text-[20px] font-semibold leading-[26px] text-acr-ink small:block">
          Mentett szállítási címek
        </h2>
        <div className="w-full small:w-auto">
          <AddAddress region={region} addresses={customer.addresses ?? []} />
        </div>
      </div>
      {cimek.length === 0 ? (
        <p
          className="text-[13px] leading-[18px] text-acr-slate"
          data-testid="address-empty"
        >
          Még nincs mentett címed.
        </p>
      ) : (
        <ul className="flex flex-col items-start gap-3 small:gap-4">
          {cimek.map((address) => (
            <li key={address.id} className="max-w-full">
              <EditAddress region={region} address={address} />
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export default AddressBook
