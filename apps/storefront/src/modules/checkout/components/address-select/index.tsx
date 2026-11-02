import { Listbox, Transition } from "@headlessui/react"
import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import { orszagNev, teljesNev, varosSor } from "@lib/util/penztar-cim"
import { ChevronUpDown } from "@medusajs/icons"
import { clx } from "@modules/common/components/ui"
import { Fragment, useMemo } from "react"

import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"

type AddressSelectProps = {
  addresses: HttpTypes.StoreCustomerAddress[]
  addressInput: HttpTypes.StoreCartAddress | null
  onSelect: (
    address: HttpTypes.StoreCartAddress | undefined,
    email?: string,
  ) => void
}

const AddressSelect = ({
  addresses,
  addressInput,
  onSelect,
}: AddressSelectProps) => {
  const t = useTranslate()
  const locale = useLocale()
  const handleSelect = (id: string) => {
    const savedAddress = addresses.find((a) => a.id === id)
    if (savedAddress) {
      onSelect(savedAddress as HttpTypes.StoreCartAddress)
    }
  }

  const selectedAddress = useMemo(() => {
    return addresses.find(
      (a) => addressInput && compareAddresses(a, addressInput),
    )
  }, [addresses, addressInput])

  return (
    <Listbox onChange={handleSelect} value={selectedAddress?.id}>
      <div className="relative">
        <Listbox.Button
          className="relative flex h-12 w-full cursor-default items-center justify-between border border-acr-line bg-acr-white px-3 text-left text-[14px] leading-[22px] text-acr-ink focus:outline-none focus-visible:border-acr-ink"
          data-testid="shipping-address-select"
        >
          {({ open }) => (
            <>
              <span className="block truncate">
                {selectedAddress
                  ? selectedAddress.address_1
                  : t("checkoutPage.chooseAddress")}
              </span>
              <ChevronUpDown
                className={clx("transition-rotate duration-200", {
                  "transform rotate-180": open,
                })}
              />
            </>
          )}
        </Listbox.Button>
        <Transition
          as={Fragment}
          leave="transition ease-in duration-100"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <Listbox.Options
            className="absolute z-20 max-h-60 w-full overflow-auto border border-t-0 border-acr-line bg-acr-white text-[14px] leading-[22px] focus:outline-none"
            data-testid="shipping-address-options"
          >
            {addresses.map((address) => {
              return (
                <Listbox.Option
                  key={address.id}
                  value={address.id}
                  className="relative cursor-default select-none py-4 pl-6 pr-10 hover:bg-acr-mist"
                  data-testid="shipping-address-option"
                >
                  <div className="flex gap-x-4 items-start">
                    <span
                      aria-hidden="true"
                      className={clx(
                        "mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                        selectedAddress?.id === address.id
                          ? "border-acr-navy"
                          : "border-acr-line",
                      )}
                      data-testid="shipping-address-radio"
                      data-checked={selectedAddress?.id === address.id}
                    >
                      {selectedAddress?.id === address.id && (
                        <span className="h-2 w-2 rounded-full bg-acr-navy" />
                      )}
                    </span>
                    <div className="flex flex-col">
                      <span className="text-left text-[16px] font-medium leading-[26px] text-acr-ink">
                        {teljesNev(
                          address.first_name,
                          address.last_name,
                          locale,
                        )}
                      </span>
                      {address.company && (
                        <span className="text-[14px] leading-[22px] text-acr-slate">
                          {address.company}
                        </span>
                      )}
                      <div className="mt-2 flex flex-col text-left text-[14px] leading-[22px] text-acr-slate">
                        <span>
                          {address.address_1}
                          {address.address_2 && (
                            <span>, {address.address_2}</span>
                          )}
                        </span>
                        <span>
                          {varosSor(address.postal_code, address.city)}
                        </span>
                        <span>
                          {address.province && `${address.province}, `}
                          {orszagNev(address.country_code, locale)}
                        </span>
                      </div>
                    </div>
                  </div>
                </Listbox.Option>
              )
            })}
          </Listbox.Options>
        </Transition>
      </div>
    </Listbox>
  )
}

export default AddressSelect
