"use client"
import { Radio, RadioGroup } from "@headlessui/react"
import { mentsMegjegyzeseket, setShippingMethod } from "@lib/data/cart"
import { calculatePriceForShippingOption } from "@lib/data/fulfillment"
import {
  searchFoxpostPickupPoints,
  searchGlsPickupPoints,
} from "@lib/data/csomagpont"
import {
  type CsomagpontKereses,
  foxpostSzallitasiAdat,
  glsSzallitasiAdat,
  type GlsPontMod,
} from "@lib/util/csomagpont"
import { GLS_LOGO, SZALLITASI_SOR } from "@lib/util/gls"
import { megjegyzesekKosarbol, megjegyzesValtozas } from "@lib/util/megjegyzes"
import { convertToLocale } from "@lib/util/money"
import { SZALLITAS_MOST_NEM_SIKERULT } from "@lib/util/penztar-uzenet"
import { CheckCircleSolid, Loader } from "@medusajs/icons"
import { HttpTypes } from "@medusajs/types"
import CsomagpontValaszto from "@modules/checkout/components/csomagpont-valaszto"
import FoxpostLogo from "@modules/checkout/components/foxpost-logo"
import FoxpostValaszto, {
  type FoxpostKivalasztott,
} from "@modules/checkout/components/foxpost-valaszto"
import ErrorMessage from "@modules/checkout/components/error-message"
import GlsValaszto, {
  type GlsKivalasztott,
} from "@modules/checkout/components/gls-valaszto"
import RendelesMegjegyzes from "@modules/checkout/components/rendeles-megjegyzes"
import Divider from "@modules/common/components/divider"
import MedusaRadio from "@modules/common/components/radio"
import { Button, clx, Heading, Text } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

type ShippingProps = {
  cart: HttpTypes.StoreCart
  availableShippingMethods: HttpTypes.StoreCartShippingOption[] | null
  /**
   * A Foxpost-mod azonositoja (`GET /store/foxpost`). Ennel a modnal a
   * kivalasztas a csomagpont-valasztot nyitja meg: pont nelkul a hatter a
   * modot elutasitja.
   */
  foxpostOptionId?: string | null
  /** A GLS csomagpontos modok (`GET /store/gls`); ugyanigy valasztot nyitnak. */
  glsOptions?: GlsPontMod[]
  /** A GLS hazhoz szallito modok (`GET /store/gls`): a soruk GLS-logot kap. */
  glsHomeOptions?: GlsPontMod[]
}

/** Egy csomagpontos mod: kinel, hogyan keres, es milyen adatot kuld a modhoz. */
type PontMod = {
  szolgaltato: string
  kereso: (kereses: string) => Promise<CsomagpontKereses>
  adat: (pontId: string) => Record<string, unknown>
  adatKulcs: "foxpost_pickup_point" | "gls_pickup_point"
}

function formatAddress(address: HttpTypes.StoreCartAddress) {
  if (!address) {
    return ""
  }

  let ret = ""

  if (address.address_1) {
    ret += ` ${address.address_1}`
  }

  if (address.address_2) {
    ret += `, ${address.address_2}`
  }

  if (address.postal_code) {
    ret += `, ${address.postal_code} ${address.city}`
  }

  if (address.country_code) {
    ret += `, ${address.country_code.toUpperCase()}`
  }

  return ret
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
  foxpostOptionId = null,
  glsOptions = [],
  glsHomeOptions = [],
}) => {
  // CSOMAGPONTOS MODOK, EGY HELYEN: a Foxpost es a GLS ugyanigy viselkedik
  // (Balazs, 2026-09-29: a ket valaszto amennyire lehet, egyforma legyen).
  const pontModok = new Map<string, PontMod>()
  if (foxpostOptionId) {
    pontModok.set(foxpostOptionId, {
      szolgaltato: "Foxpost",
      kereso: (q) => searchFoxpostPickupPoints(q),
      adat: foxpostSzallitasiAdat,
      adatKulcs: "foxpost_pickup_point",
    })
  }
  for (const gls of glsOptions) {
    pontModok.set(gls.option_id, {
      szolgaltato: "GLS",
      kereso: (q) => searchGlsPickupPoints(q, gls.option_id),
      adat: glsSzallitasiAdat,
      adatKulcs: "gls_pickup_point",
    })
  }
  const [isLoading, setIsLoading] = useState(false)
  const [isLoadingPrices, setIsLoadingPrices] = useState(true)

  const [showPickupOptions, setShowPickupOptions] =
    useState<string>(PICKUP_OPTION_OFF)
  const [calculatedPricesMap, setCalculatedPricesMap] = useState<
    Record<string, number>
  >({})
  const [error, setError] = useState<string | null>(null)
  const [megjegyzesek, setMegjegyzesek] = useState(() =>
    megjegyzesekKosarbol(cart.metadata),
  )
  const [shippingMethodId, setShippingMethodId] = useState<string | null>(
    cart.shipping_methods?.at(-1)?.shipping_option_id || null,
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = searchParams.get("step") === "delivery"

  const _shippingMethods = availableShippingMethods?.filter(
    (sm) =>
      (
        sm as unknown as {
          service_zone?: {
            fulfillment_set?: {
              type?: string
              location?: { address: HttpTypes.StoreCartAddress }
            }
          }
        }
      ).service_zone?.fulfillment_set?.type !== "pickup",
  )

  const _pickupMethods = availableShippingMethods?.filter(
    (sm) =>
      (
        sm as unknown as {
          service_zone?: {
            fulfillment_set?: {
              type?: string
              location?: { address: HttpTypes.StoreCartAddress }
            }
          }
        }
      ).service_zone?.fulfillment_set?.type === "pickup",
  )

  const hasPickupOptions = !!_pickupMethods?.length

  useEffect(() => {
    setIsLoadingPrices(true)

    if (_shippingMethods?.length) {
      const promises = _shippingMethods
        .filter((sm) => sm.price_type === "calculated")
        .map((sm) => calculatePriceForShippingOption(sm.id, cart.id))

      if (promises.length) {
        Promise.allSettled(promises).then((res) => {
          const pricesMap: Record<string, number> = {}
          res
            .filter((r) => r.status === "fulfilled")
            .forEach((p) => {
              if (p.value?.id) {
                pricesMap[p.value.id] = p.value.amount ?? 0
              }
            })

          setCalculatedPricesMap(pricesMap)
          setIsLoadingPrices(false)
        })
      }
    }

    if (_pickupMethods?.find((m) => m.id === shippingMethodId)) {
      setShowPickupOptions(PICKUP_OPTION_ON)
    }
  }, [availableShippingMethods])

  const handleEdit = () => {
    router.push(pathname + "?step=delivery", { scroll: false })
  }

  // A futarnak szolo megjegyzes csak hazhoz szallitasnal el (kartya d3b54954).
  const hazhoz =
    !!shippingMethodId &&
    !pontModok.has(shippingMethodId) &&
    !_pickupMethods?.some((m) => m.id === shippingMethodId)

  const handleSubmit = async () => {
    const valtozas = megjegyzesValtozas(
      megjegyzesekKosarbol(cart.metadata),
      megjegyzesek,
      hazhoz,
    )
    if (valtozas) {
      setIsLoading(true)
      const eredmeny = await mentsMegjegyzeseket(cart.id, valtozas)
      setIsLoading(false)
      if (!eredmeny.ok) {
        setError(eredmeny.uzenet)
        return
      }
    }
    router.push(pathname + "?step=payment", { scroll: false })
  }

  const handleSetShippingMethod = async (
    id: string,
    variant: "shipping" | "pickup",
  ) => {
    setError(null)

    if (variant === "pickup") {
      setShowPickupOptions(PICKUP_OPTION_ON)
    } else {
      setShowPickupOptions(PICKUP_OPTION_OFF)
    }

    // CSOMAGPONTOS MOD (Foxpost, GLS): csak ponttal allithato be. A valaszto
    // nyilik meg, es a pont kivalasztasa allitja be a modot (`handlePont`).
    if (pontModok.has(id)) {
      setShippingMethodId(id)
      return
    }

    let currentId: string | null = null
    setIsLoading(true)
    setShippingMethodId((prev) => {
      currentId = prev
      return id
    })

    /*
      A HIBA A MUVELET VALASZABOL JON, NEM A KIVETELBOL.

      Itt korabban `.catch((err) => setError(err.message))` allt. Produkcioban
      a Next a szerver-muveletbol DOBOTT hiba uzenetet lecsereli egy altalanos
      angol mondatra, tehat a vevo a penztarban is azt latta volna, amit a
      kedvezmenykodnal mar lemertunk (#371). Egy VISSZAADOTT ertek
      valtozatlanul atmegy a hataron.

      A VISSZAALLITAS IS AZ AGHOZ TARTOZIK: sikertelen beallitasnal a
      valasztott mod visszaugrik az elozore, kulonben a felulet olyat mutatna
      kivalasztottnak, ami nem all a kosarban.
    */
    try {
      const eredmeny = await setShippingMethod({
        cartId: cart.id,
        shippingMethodId: id,
      })

      if (!eredmeny.ok) {
        setShippingMethodId(currentId)
        setError(eredmeny.uzenet)
      }
    } catch {
      setShippingMethodId(currentId)
      setError(SZALLITAS_MOST_NEM_SIKERULT)
    } finally {
      setIsLoading(false)
    }
  }

  const aktivPontMod = shippingMethodId
    ? pontModok.get(shippingMethodId)
    : undefined

  const handlePont = async (
    pont: { id: string },
    forras?: "finder" | "fallback",
  ) => {
    if (!shippingMethodId || !aktivPontMod) return
    setError(null)
    setIsLoading(true)
    try {
      const eredmeny = await setShippingMethod({
        cartId: cart.id,
        shippingMethodId,
        data:
          aktivPontMod.adatKulcs === "gls_pickup_point"
            ? glsSzallitasiAdat(pont.id, forras ?? "fallback")
            : aktivPontMod.adat(pont.id),
      })
      if (!eredmeny.ok) setError(eredmeny.uzenet)
    } catch {
      setError(SZALLITAS_MOST_NEM_SIKERULT)
    } finally {
      setIsLoading(false)
    }
  }

  // A kosarban allo mod: a "Tovabb" csak akkor mehet, ha a KIVALASZTOTT mod
  // tenyleg a kosarban all. Foxpostnal a pont kivalasztasaig nem all ott.
  const kosarMod = cart.shipping_methods?.at(-1)
  const kosarPont =
    aktivPontMod && kosarMod?.shipping_option_id === shippingMethodId
      ? ((kosarMod?.data as Record<string, unknown> | undefined)?.[
          aktivPontMod.adatKulcs
        ] as FoxpostKivalasztott | undefined)
      : undefined
  const foxpostAktiv = !!foxpostOptionId && shippingMethodId === foxpostOptionId
  const glsPontAktiv = glsOptions.find((o) => o.option_id === shippingMethodId)

  /**
   * A SOR SZOVEGE ES LOGOJA SZOLGALTATONKENT (a GLS-prompt 2. pontja, Figma
   * 508:34-508:70): a mod neve az adatbazisban marad, a vevo ezt latja.
   */
  const sorOf = (optionId: string) => {
    if (optionId === foxpostOptionId)
      return { ...SZALLITASI_SOR.foxpost, logo: "foxpost" as const }
    const pont = glsOptions.find((o) => o.option_id === optionId)
    if (pont)
      return {
        ...(pont.heavy ? SZALLITASI_SOR.glsPontNehez : SZALLITASI_SOR.glsPont),
        logo: GLS_LOGO.csomagpont,
      }
    const haz = glsHomeOptions.find((o) => o.option_id === optionId)
    if (haz)
      return {
        ...(haz.heavy ? SZALLITASI_SOR.glsHazNehez : SZALLITASI_SOR.glsHaz),
        logo: GLS_LOGO.altalanos,
      }
    return null
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  return (
    <div className="bg-white">
      <div className="flex flex-row items-center justify-between mb-6">
        <Heading
          level="h2"
          className={clx(
            "flex flex-row text-3xl-regular gap-x-2 items-baseline",
            {
              "opacity-50 pointer-events-none select-none":
                !isOpen && cart.shipping_methods?.length === 0,
            },
          )}
        >
          Szállítás
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </Heading>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <Text>
              <button
                onClick={handleEdit}
                className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
                data-testid="edit-delivery-button"
              >
                Szerkesztés
              </button>
            </Text>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="font-medium txt-medium text-ui-fg-base">
                Szállítási mód
              </span>
              <span className="mb-4 text-ui-fg-muted txt-medium">
                Hogyan szeretnéd átvenni a rendelésedet?
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 md:pt-0 pt-2">
                {hasPickupOptions && (
                  <RadioGroup
                    value={showPickupOptions}
                    onChange={(_value) => {
                      const id = _pickupMethods.find(
                        (option) => !option.insufficient_inventory,
                      )?.id

                      if (id) {
                        handleSetShippingMethod(id, "pickup")
                      }
                    }}
                  >
                    <Radio
                      value={PICKUP_OPTION_ON}
                      data-testid="delivery-option-radio"
                      className={clx(
                        "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                        {
                          "border-ui-border-interactive":
                            showPickupOptions === PICKUP_OPTION_ON,
                        },
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <MedusaRadio
                          checked={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-base-regular">
                          Átvétel üzletben
                        </span>
                      </div>
                      <span className="justify-self-end text-ui-fg-base">
                        -
                      </span>
                    </Radio>
                  </RadioGroup>
                )}
                <RadioGroup
                  value={shippingMethodId}
                  onChange={(v) => {
                    if (v) {
                      return handleSetShippingMethod(v, "shipping")
                    }
                  }}
                >
                  {_shippingMethods?.map((option) => {
                    const isDisabled =
                      option.price_type === "calculated" &&
                      !isLoadingPrices &&
                      typeof calculatedPricesMap[option.id] !== "number"

                    return (
                      <Radio
                        key={option.id}
                        value={option.id}
                        data-testid="delivery-option-radio"
                        disabled={isDisabled}
                        className={clx(
                          "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                          {
                            // az Acropora narancs kijeloles (a GLS-prompt 8. pontja)
                            "border-acr-heritage shadow-[inset_0_0_0_1px_var(--acr-color-heritage)]":
                              option.id === shippingMethodId,
                            "hover:shadow-brders-none cursor-not-allowed":
                              isDisabled,
                          },
                        )}
                      >
                        <div className="flex min-w-0 items-center gap-x-4">
                          <MedusaRadio
                            checked={option.id === shippingMethodId}
                          />
                          {sorOf(option.id) ? (
                            // A szolgaltato sajat megnevezese es logoja (a
                            // GLS-prompt 2. pontja); a mod neve az
                            // adatbazisban marad, ahogy van.
                            <span className="flex min-w-0 flex-col">
                              <span
                                className="text-base-regular"
                                data-testid={
                                  option.id === foxpostOptionId
                                    ? "foxpost-mod-nev"
                                    : "szallitasi-sor-nev"
                                }
                              >
                                {sorOf(option.id)!.nev}
                              </span>
                              <span
                                className="text-[12px] text-ui-fg-subtle"
                                data-testid="szallitasi-sor-leiras"
                              >
                                {sorOf(option.id)!.leiras}
                              </span>
                            </span>
                          ) : (
                            <span className="text-base-regular">
                              {option.name}
                            </span>
                          )}
                        </div>
                        {sorOf(option.id)?.logo === "foxpost" ? (
                          <FoxpostLogo className="ml-auto mr-6 hidden h-[30px] w-auto shrink-0 small:block" />
                        ) : sorOf(option.id)?.logo ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={sorOf(option.id)!.logo}
                            alt=""
                            className={clx(
                              "ml-auto mr-4 w-auto shrink-0",
                              sorOf(option.id)!.logo === GLS_LOGO.altalanos
                                ? "h-[22px]"
                                : "h-[28px]",
                            )}
                            data-testid="szallitasi-sor-logo"
                          />
                        ) : null}
                        <span className="justify-self-end text-ui-fg-base">
                          {option.price_type === "flat" ? (
                            convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })
                          ) : calculatedPricesMap[option.id] ? (
                            convertToLocale({
                              amount: calculatedPricesMap[option.id],
                              currency_code: cart?.currency_code,
                            })
                          ) : isLoadingPrices ? (
                            <Loader />
                          ) : (
                            "-"
                          )}
                        </span>
                      </Radio>
                    )
                  })}
                </RadioGroup>
                {foxpostAktiv ? (
                  <FoxpostValaszto
                    key={shippingMethodId ?? ""}
                    kivalasztott={kosarPont ?? null}
                    onValaszt={handlePont}
                  />
                ) : glsPontAktiv ? (
                  <GlsValaszto
                    key={shippingMethodId ?? ""}
                    optionId={glsPontAktiv.option_id}
                    nehez={glsPontAktiv.heavy}
                    kivalasztott={(kosarPont as GlsKivalasztott) ?? null}
                    onValaszt={(id, forras) => handlePont({ id }, forras)}
                  />
                ) : aktivPontMod ? (
                  <CsomagpontValaszto
                    key={shippingMethodId ?? ""}
                    szolgaltato={aktivPontMod.szolgaltato}
                    kereso={aktivPontMod.kereso}
                    kivalasztott={kosarPont ?? null}
                    onValaszt={handlePont}
                  />
                ) : null}
              </div>
            </div>
          </div>

          {showPickupOptions === PICKUP_OPTION_ON && (
            <div className="grid">
              <div className="flex flex-col">
                <span className="font-medium txt-medium text-ui-fg-base">
                  Üzlet
                </span>
                <span className="mb-4 text-ui-fg-muted txt-medium">
                  Válassz egy közeli üzletet
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 md:pt-0 pt-2">
                  <RadioGroup
                    value={shippingMethodId}
                    onChange={(v) => {
                      if (v) {
                        return handleSetShippingMethod(v, "pickup")
                      }
                    }}
                  >
                    {_pickupMethods?.map((option) => {
                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          disabled={option.insufficient_inventory}
                          data-testid="delivery-option-radio"
                          className={clx(
                            "flex items-center justify-between text-small-regular cursor-pointer py-4 border rounded-rounded px-8 mb-2 hover:shadow-borders-interactive-with-active",
                            {
                              "border-ui-border-interactive":
                                option.id === shippingMethodId,
                              "hover:shadow-brders-none cursor-not-allowed":
                                option.insufficient_inventory,
                            },
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <MedusaRadio
                              checked={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-base-regular">
                                {option.name}
                              </span>
                              <span className="text-base-regular text-ui-fg-muted">
                                {formatAddress(
                                  (
                                    option as unknown as {
                                      service_zone?: {
                                        fulfillment_set?: {
                                          location?: {
                                            address: HttpTypes.StoreCartAddress
                                          }
                                        }
                                      }
                                    }
                                  ).service_zone?.fulfillment_set?.location
                                    ?.address as HttpTypes.StoreCartAddress,
                                )}
                              </span>
                            </div>
                          </div>
                          <span className="justify-self-end text-ui-fg-base">
                            {convertToLocale({
                              amount: option.amount!,
                              currency_code: cart?.currency_code,
                            })}
                          </span>
                        </Radio>
                      )
                    })}
                  </RadioGroup>
                </div>
              </div>
            </div>
          )}

          <RendelesMegjegyzes
            ertek={megjegyzesek}
            valtozik={setMegjegyzesek}
            hazhoz={hazhoz}
          />

          <div>
            <ErrorMessage
              error={error}
              data-testid="delivery-option-error-message"
            />
            <Button
              size="large"
              className="mt"
              onClick={handleSubmit}
              isLoading={isLoading}
              disabled={
                !cart.shipping_methods?.[0] ||
                kosarMod?.shipping_option_id !== shippingMethodId
              }
              data-testid="submit-delivery-option-button"
            >
              Tovább a fizetéshez
            </Button>
          </div>
        </>
      ) : (
        <div>
          <div className="text-small-regular">
            {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Mód
                </Text>
                <Text className="txt-medium text-ui-fg-subtle">
                  {cart.shipping_methods!.at(-1)!.name}{" "}
                  {convertToLocale({
                    amount: cart.shipping_methods!.at(-1)!.amount!,
                    currency_code: cart?.currency_code,
                  })}
                </Text>
              </div>
            )}
          </div>
        </div>
      )}
      <Divider className="mt-8" />
    </div>
  )
}

export default Shipping
