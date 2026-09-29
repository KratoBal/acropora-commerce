"use client"

import { Button, Heading } from "@modules/common/components/ui"
import { useActionState, useEffect, useState } from "react"

import { addCustomerAddress, type CimMentesAllapot } from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"

import CimMezok from "../cim-mezok"

const AddAddress = ({
  region,
  addresses,
}: {
  region: HttpTypes.StoreRegion
  addresses: HttpTypes.StoreCustomerAddress[]
}) => {
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(addCustomerAddress, {
    success: false,
    error: null,
  } as CimMentesAllapot)
  // A failed save refills from the submitted values (React 19 resets the form).
  const beirt = formState.error ? formState.ertekek : undefined

  const close = () => {
    setSuccessState(false)
    closeModal()
  }

  useEffect(() => {
    if (successState) {
      close()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [successState])

  useEffect(() => {
    if (formState.success) {
      setSuccessState(true)
    }
  }, [formState])

  return (
    <>
      {/* Az "Új cím" gomb (257:85; mobilon a lista alatt, 257:267). */}
      <button
        type="button"
        className="flex h-[46px] w-full items-center justify-center bg-acr-heritage font-acr-sans text-[13.5px] font-semibold text-acr-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:[outline-color:var(--acr-color-heritage)] small:h-[44px] small:w-[120px]"
        onClick={open}
        data-testid="add-address-button"
      >
        Új cím
      </button>

      <Modal isOpen={state} close={close} data-testid="add-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Cím hozzáadása</Heading>
        </Modal.Title>
        <form action={formAction}>
          <Modal.Body>
            <div className="flex flex-col gap-y-2">
              <CimMezok
                nev={beirt?.address_name}
                alapertelmezett={
                  beirt
                    ? beirt.is_default_shipping === "on"
                    : addresses.length === 0
                }
              />
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="Keresztnév"
                  name="first_name"
                  defaultValue={beirt?.first_name}
                  required
                  autoComplete="given-name"
                  data-testid="first-name-input"
                />
                <Input
                  label="Vezetéknév"
                  name="last_name"
                  defaultValue={beirt?.last_name}
                  required
                  autoComplete="family-name"
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label="Cégnév"
                name="company"
                defaultValue={beirt?.company}
                autoComplete="organization"
                data-testid="company-input"
              />
              <Input
                label="Cím"
                name="address_1"
                defaultValue={beirt?.address_1}
                required
                autoComplete="address-line1"
                data-testid="address-1-input"
              />
              <Input
                label="Emelet, ajtó stb."
                name="address_2"
                defaultValue={beirt?.address_2}
                autoComplete="address-line2"
                data-testid="address-2-input"
              />
              <div className="grid grid-cols-[144px_1fr] gap-x-2">
                <Input
                  label="Irányítószám"
                  name="postal_code"
                  defaultValue={beirt?.postal_code}
                  required
                  autoComplete="postal-code"
                  data-testid="postal-code-input"
                />
                <Input
                  label="Város"
                  name="city"
                  defaultValue={beirt?.city}
                  required
                  autoComplete="locality"
                  data-testid="city-input"
                />
              </div>
              <Input
                label="Megye / állam"
                name="province"
                defaultValue={beirt?.province}
                autoComplete="address-level1"
                data-testid="state-input"
              />
              <CountrySelect
                region={region}
                name="country_code"
                defaultValue={beirt?.country_code}
                required
                autoComplete="country"
                data-testid="country-select"
              />
              <Input
                label="Telefonszám"
                name="phone"
                defaultValue={beirt?.phone}
                autoComplete="phone"
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div
                className="text-rose-500 text-small-regular py-2"
                data-testid="address-error"
              >
                {formState.error}
              </div>
            )}
          </Modal.Body>
          <Modal.Footer>
            <div className="flex gap-3 mt-6">
              <Button
                type="reset"
                variant="secondary"
                onClick={close}
                className="h-10"
                data-testid="cancel-button"
              >
                Mégse
              </Button>
              <SubmitButton data-testid="save-button">Mentés</SubmitButton>
            </div>
          </Modal.Footer>
        </form>
      </Modal>
    </>
  )
}

export default AddAddress
