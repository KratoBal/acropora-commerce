"use client"

import {
  type CimMentesAllapot,
  deleteCustomerAddress,
  updateCustomerAddress,
} from "@lib/data/customer"
import useToggleState from "@lib/hooks/use-toggle-state"
import { HttpTypes } from "@medusajs/types"
import CountrySelect from "@modules/checkout/components/country-select"
import { SubmitButton } from "@modules/checkout/components/submit-button"
import Input from "@modules/common/components/input"
import Modal from "@modules/common/components/modal"
import { cimCim, cimSor } from "@lib/util/cim"
import { Button, Heading, clx } from "@modules/common/components/ui"
import React, { useActionState, useEffect, useState } from "react"

import CimMezok from "../cim-mezok"

type EditAddressProps = {
  region: HttpTypes.StoreRegion
  address: HttpTypes.StoreCustomerAddress
  isActive?: boolean
}

const EditAddress: React.FC<EditAddressProps> = ({
  region,
  address,
  isActive = false,
}) => {
  const [removing, setRemoving] = useState(false)
  const [successState, setSuccessState] = useState(false)
  const { state, open, close: closeModal } = useToggleState(false)

  const [formState, formAction] = useActionState(updateCustomerAddress, {
    success: false,
    error: null,
  } as CimMentesAllapot)
  // A failed save refills from the submitted values, not the saved ones
  // (React 19 resets the form after the action).
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

  const removeAddress = async () => {
    setRemoving(true)
    await deleteCustomerAddress(address.id)
    setRemoving(false)
  }

  return (
    <>
      {/*
        A KARTYA (P5, 257:87; mobilon 257:258): feher, keretes, a tartalomhoz
        simulo szelesseg, mobilon is (a keret kartyai 189 es 177 px-esek). Cim 600/15 (mobilon 14) az "ALAPÉRTELMEZETT"
        jelolovel, a cim egy sorban 13 px palaban, alatta Szerkesztés (rez) es
        Törlés (pala).
      */}
      <div
        className={clx(
          "flex w-auto max-w-full flex-col gap-[6px] border bg-acr-white p-3 font-acr-sans small:gap-2 small:p-[18px]",
          isActive ? "border-acr-ink" : "border-acr-line",
        )}
        data-testid="address-container"
      >
        {/* Mobilon (257:258) a sorrend: nev, cim, jelolo, muveletek; asztalon a jelolo a nev mellett. */}
        <div className="contents small:flex small:flex-row small:items-start small:gap-2">
          <p
            className="order-1 text-[14px] font-semibold leading-[18px] text-acr-ink small:order-none small:text-[15px] small:leading-[20px]"
            data-testid="address-name"
          >
            {cimCim(address)}
          </p>
          {address.is_default_shipping ? (
            <span
              className="order-3 text-[9.5px] font-semibold uppercase leading-[12px] tracking-[0.7px] text-acr-heritage small:order-none"
              data-testid="address-default"
            >
              Alapértelmezett
            </span>
          ) : null}
        </div>
        <p
          className="order-2 text-[12px] leading-[16px] small:order-none text-acr-slate small:text-[13px] small:leading-[17px]"
          data-testid="address-address"
        >
          {cimSor(address)}
        </p>
        <div className="order-4 flex items-center gap-[14px] text-[11.5px] small:order-none leading-[15px] small:text-[12.5px] small:leading-[16px]">
          <button
            type="button"
            className="font-medium text-acr-heritage hover:underline"
            onClick={open}
            data-testid="address-edit-button"
          >
            Szerkesztés
          </button>
          <span
            className="-mx-[10px] font-medium text-acr-heritage small:hidden"
            aria-hidden="true"
          >
            ·
          </span>
          <button
            type="button"
            className="font-medium text-acr-heritage hover:underline disabled:opacity-60 small:font-normal small:text-acr-slate small:hover:text-acr-ink"
            onClick={removeAddress}
            disabled={removing}
            aria-busy={removing}
            data-testid="address-delete-button"
          >
            Törlés
          </button>
        </div>
      </div>

      <Modal isOpen={state} close={close} data-testid="edit-address-modal">
        <Modal.Title>
          <Heading className="mb-2">Cím szerkesztése</Heading>
        </Modal.Title>
        <form action={formAction}>
          <input type="hidden" name="addressId" value={address.id} />
          <Modal.Body>
            <div className="grid grid-cols-1 gap-y-2">
              <CimMezok
                nev={beirt?.address_name ?? address.address_name}
                alapertelmezett={
                  beirt
                    ? beirt.is_default_shipping === "on"
                    : address.is_default_shipping
                }
              />
              <div className="grid grid-cols-2 gap-x-2">
                <Input
                  label="Keresztnév"
                  name="first_name"
                  required
                  autoComplete="given-name"
                  defaultValue={beirt?.first_name ?? (address.first_name || undefined)}
                  data-testid="first-name-input"
                />
                <Input
                  label="Vezetéknév"
                  name="last_name"
                  required
                  autoComplete="family-name"
                  defaultValue={beirt?.last_name ?? (address.last_name || undefined)}
                  data-testid="last-name-input"
                />
              </div>
              <Input
                label="Cégnév"
                name="company"
                autoComplete="organization"
                defaultValue={beirt?.company ?? (address.company || undefined)}
                data-testid="company-input"
              />
              <Input
                label="Cím"
                name="address_1"
                required
                autoComplete="address-line1"
                defaultValue={beirt?.address_1 ?? (address.address_1 || undefined)}
                data-testid="address-1-input"
              />
              <Input
                label="Emelet, ajtó stb."
                name="address_2"
                autoComplete="address-line2"
                defaultValue={beirt?.address_2 ?? (address.address_2 || undefined)}
                data-testid="address-2-input"
              />
              <div className="grid grid-cols-[144px_1fr] gap-x-2">
                <Input
                  label="Irányítószám"
                  name="postal_code"
                  required
                  autoComplete="postal-code"
                  defaultValue={beirt?.postal_code ?? (address.postal_code || undefined)}
                  data-testid="postal-code-input"
                />
                <Input
                  label="Város"
                  name="city"
                  required
                  autoComplete="locality"
                  defaultValue={beirt?.city ?? (address.city || undefined)}
                  data-testid="city-input"
                />
              </div>
              <Input
                label="Megye / állam"
                name="province"
                autoComplete="address-level1"
                defaultValue={beirt?.province ?? (address.province || undefined)}
                data-testid="state-input"
              />
              <CountrySelect
                name="country_code"
                region={region}
                required
                autoComplete="country"
                defaultValue={beirt?.country_code ?? (address.country_code || undefined)}
                data-testid="country-select"
              />
              <Input
                label="Telefonszám"
                name="phone"
                autoComplete="phone"
                defaultValue={beirt?.phone ?? (address.phone || undefined)}
                data-testid="phone-input"
              />
            </div>
            {formState.error && (
              <div className="text-rose-500 text-small-regular py-2">
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

export default EditAddress
