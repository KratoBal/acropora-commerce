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
  foxpostTiltvaSzoveg,
  glsSzallitasiAdat,
  type GlsPontMod,
} from "@lib/util/csomagpont"
import type { Locale } from "@lib/i18n/locale"
import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import {
  boltiAtvetelTiltvaSzoveg,
  mindenAtvetelLetiltott,
} from "@lib/util/bolti-atvetel"
import { GLS_LOGO, szallitasiSor } from "@lib/util/gls"
import { megjegyzesekKosarbol, megjegyzesValtozas } from "@lib/util/megjegyzes"
import { arSzoveg } from "@lib/util/ar-szoveg"
import { orszagNev, varosSor } from "@lib/util/penztar-cim"
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
import {
  PenztarGomb,
  PenztarRadioJelolo,
} from "@modules/checkout/components/penztar-mezo"
import { clx } from "@modules/common/components/ui"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

const PICKUP_OPTION_ON = "__PICKUP_ON"
const PICKUP_OPTION_OFF = "__PICKUP_OFF"

/** A választó kártyák: közös alak, kijelöléskor a narancs keret. */
const MOD_KARTYA =
  "mb-2 flex cursor-pointer items-center justify-between gap-3 border px-4 py-4 small:px-6"
const KARTYA_KERET = "border-acr-line hover:border-acr-ink"
const KIJELOLT_KARTYA =
  "border-acr-heritage shadow-[inset_0_0_0_1px_var(--acr-color-heritage)]"

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
  /**
   * A tetel neve, ami miatt a FOXPOST nem jar (Foxpost-prompt 7.5,
   * `foxpostTiltottTetel`); `null`, ha jar, vagy nem tudjuk megnevezni.
   */
  foxpostTiltottTetel?: string | null
  /**
   * A kosar csak csomagboltba mehet GLS csomagponton (a82ed229,
   * `csakCsomagboltOsztaly`): egy tetele nem fer automataba.
   */
  csakCsomagbolt?: boolean
  /**
   * V2.5 B: a tetelek neve, amelyekbol nincs keszlet a bolti atvetel helyen
   * (`GET /store/pickup-shortage`); `null`, ha nem tudjuk megnevezni.
   */
  boltiHiany?: string[] | null
}

/** Egy csomagpontos mod: kinel, hogyan keres, es milyen adatot kuld a modhoz. */
type PontMod = {
  szolgaltato: string
  kereso: (kereses: string) => Promise<CsomagpontKereses>
  adat: (pontId: string) => Record<string, unknown>
  adatKulcs: "foxpost_pickup_point" | "gls_pickup_point"
}

function formatAddress(
  address: HttpTypes.StoreCartAddress | undefined,
  locale: Locale,
) {
  if (!address) {
    return ""
  }

  return [
    [address.address_1, address.address_2].filter(Boolean).join(", "),
    varosSor(address.postal_code, address.city),
    orszagNev(address.country_code, locale),
  ]
    .filter(Boolean)
    .join(", ")
}

const Shipping: React.FC<ShippingProps> = ({
  cart,
  availableShippingMethods,
  foxpostOptionId = null,
  glsOptions = [],
  glsHomeOptions = [],
  foxpostTiltottTetel = null,
  csakCsomagbolt = false,
  boltiHiany = null,
}) => {
  const t = useTranslate()
  const locale = useLocale()
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
      kereso: (q) =>
        searchGlsPickupPoints(q, gls.option_id, 20, locale, cart?.id),
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
  // V2.5 B: ha a Medusa minden bolti atvetelt letiltott, a mod kartyaja sem valaszthato, es megmondja, miert
  const atvetelLetiltva = mindenAtvetelLetiltott(availableShippingMethods)
  // az üzleti átvétel sora a legolcsóbb üzlet árát mutatja (ha egyiknek sincs ára, semmit)
  const raktarArak = (_pickupMethods ?? [])
    .map((m) => m.amount)
    .filter((a): a is number => typeof a === "number")
  const raktarAr = raktarArak.length ? Math.min(...raktarArak) : null

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
        setError(eredmeny.kod ? t(eredmeny.kod) : eredmeny.uzenet)
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
        setError(eredmeny.kod ? t(eredmeny.kod) : eredmeny.uzenet)
      }
    } catch {
      setShippingMethodId(currentId)
      setError(t("checkoutShipping.errorFailed"))
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
            : foxpostSzallitasiAdat(pont.id, forras ?? "fallback"),
      })
      if (!eredmeny.ok)
        setError(eredmeny.kod ? t(eredmeny.kod) : eredmeny.uzenet)
    } catch {
      setError(t("checkoutShipping.errorFailed"))
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
      return { ...szallitasiSor("foxpost", t), logo: "foxpost" as const }
    const pont = glsOptions.find((o) => o.option_id === optionId)
    if (pont)
      return {
        ...szallitasiSor(pont.heavy ? "glsPontNehez" : "glsPont", t),
        logo: GLS_LOGO.csomagpont,
      }
    const haz = glsHomeOptions.find((o) => o.option_id === optionId)
    if (haz)
      return {
        ...szallitasiSor(haz.heavy ? "glsHazNehez" : "glsHaz", t),
        logo: GLS_LOGO.altalanos,
      }
    return null
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  const lezart = !isOpen && (cart.shipping_methods?.length ?? 0) === 0
  const arSzovegIde = (amount: number) =>
    arSzoveg(amount, cart?.currency_code, t)
  const tiltott = !!foxpostTiltottTetel

  return (
    <section className="border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6">
      <div className="mb-4 flex flex-row items-center justify-between">
        <h2
          className={clx(
            "flex flex-row items-center gap-x-2 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]",
            { "pointer-events-none select-none opacity-50": lezart },
          )}
        >
          {t("checkoutShipping.heading")}
          {!isOpen && (cart.shipping_methods?.length ?? 0) > 0 && (
            <CheckCircleSolid />
          )}
        </h2>
        {!isOpen &&
          cart?.shipping_address &&
          cart?.billing_address &&
          cart?.email && (
            <button
              onClick={handleEdit}
              className="text-[14px] font-medium leading-[22px] text-acr-ocean underline"
              data-testid="edit-delivery-button"
            >
              {t("checkoutPage.edit")}
            </button>
          )}
      </div>
      {isOpen ? (
        <>
          <div className="grid">
            <div className="flex flex-col">
              <span className="text-[16px] font-medium leading-[26px] text-acr-ink">
                {t("checkoutShipping.modeHeading")}
              </span>
              <span className="mb-4 text-[14px] leading-[22px] text-acr-slate">
                {t("checkoutShipping.modeLead")}
              </span>
            </div>
            <div data-testid="delivery-options-container">
              <div className="pb-8 pt-2 small:pt-0">
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
                      disabled={atvetelLetiltva}
                      data-testid="delivery-option-radio"
                      className={clx(
                        MOD_KARTYA,
                        showPickupOptions === PICKUP_OPTION_ON
                          ? KIJELOLT_KARTYA
                          : KARTYA_KERET,
                        { "cursor-not-allowed opacity-60": atvetelLetiltva },
                      )}
                    >
                      <div className="flex items-center gap-x-4">
                        <PenztarRadioJelolo
                          kijelolt={showPickupOptions === PICKUP_OPTION_ON}
                        />
                        <span className="text-[14px] leading-[22px] text-acr-ink">
                          {t("checkoutShipping.storePickup")}
                        </span>
                      </div>
                      <span className="justify-self-end text-[14px] leading-[22px] text-acr-ink">
                        {raktarAr === null ? "" : arSzovegIde(raktarAr)}
                      </span>
                    </Radio>
                    {atvetelLetiltva && (
                      <span
                        className="mb-2 block text-[13px] leading-[18px] text-acr-ink"
                        data-testid="bolti-atvetel-tiltva"
                      >
                        {boltiAtvetelTiltvaSzoveg(boltiHiany, t)}
                      </span>
                    )}
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
                  {_shippingMethods
                    ?.filter(
                      (option) => !(tiltott && option.id === foxpostOptionId),
                    )
                    .map((option) => {
                      const isDisabled =
                        option.price_type === "calculated" &&
                        !isLoadingPrices &&
                        typeof calculatedPricesMap[option.id] !== "number"
                      const sor = sorOf(option.id)

                      return (
                        <Radio
                          key={option.id}
                          value={option.id}
                          data-testid="delivery-option-radio"
                          disabled={isDisabled}
                          className={clx(
                            MOD_KARTYA,
                            // az Acropora narancs kijeloles (a GLS-prompt 8. pontja)
                            option.id === shippingMethodId
                              ? KIJELOLT_KARTYA
                              : KARTYA_KERET,
                            { "cursor-not-allowed opacity-60": isDisabled },
                          )}
                        >
                          <div className="flex min-w-0 items-center gap-x-4">
                            <PenztarRadioJelolo
                              kijelolt={option.id === shippingMethodId}
                            />
                            {sor ? (
                              // A szolgaltato sajat megnevezese es logoja (a
                              // GLS-prompt 2. pontja); a mod neve az
                              // adatbazisban marad, ahogy van.
                              <span className="flex min-w-0 flex-col">
                                <span
                                  className="text-[14px] leading-[22px] text-acr-ink"
                                  data-testid={
                                    option.id === foxpostOptionId
                                      ? "foxpost-mod-nev"
                                      : "szallitasi-sor-nev"
                                  }
                                >
                                  {sor.nev}
                                </span>
                                <span
                                  className="text-[12px] leading-[18px] text-acr-slate"
                                  data-testid="szallitasi-sor-leiras"
                                >
                                  {sor.leiras}
                                </span>
                              </span>
                            ) : (
                              <span className="text-[14px] leading-[22px] text-acr-ink">
                                {option.name}
                              </span>
                            )}
                          </div>
                          {sor?.logo === "foxpost" ? (
                            <FoxpostLogo className="ml-auto mr-6 hidden h-[30px] w-auto shrink-0 small:block" />
                          ) : sor?.logo ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={sor.logo}
                              alt=""
                              className={clx(
                                "ml-auto mr-4 hidden w-auto shrink-0 small:block",
                                sor.logo === GLS_LOGO.altalanos
                                  ? "h-[22px]"
                                  : "h-[28px]",
                              )}
                              data-testid="szallitasi-sor-logo"
                            />
                          ) : null}
                          <span className="justify-self-end text-[14px] leading-[22px] text-acr-ink">
                            {option.price_type === "flat" ? (
                              arSzovegIde(option.amount!)
                            ) : calculatedPricesMap[option.id] ? (
                              arSzovegIde(calculatedPricesMap[option.id])
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
                {foxpostTiltottTetel ? (
                  // a FOXPOST nem csak eltunik: a kartyaja ott all halvanyan, nem
                  // valaszthatoan, es az ok a SAJAT kartyajaban olvashato (Figma
                  // 486:346; acrobot, 2026-11-02)
                  <div
                    aria-disabled="true"
                    className="mb-2 flex cursor-not-allowed items-start justify-between gap-3 border border-acr-line px-4 py-4 opacity-60 small:px-6"
                    data-testid="foxpost-kartya-tiltva"
                  >
                    <div className="flex min-w-0 items-start gap-x-4">
                      <PenztarRadioJelolo kijelolt={false} />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-[14px] leading-[22px] text-acr-ink">
                          {szallitasiSor("foxpost", t).nev}
                        </span>
                        <span className="text-[12px] leading-[18px] text-acr-slate">
                          {szallitasiSor("foxpost", t).leiras}
                        </span>
                        <span
                          className="mt-1 text-[13px] leading-[18px] text-acr-ink"
                          data-testid="foxpost-tiltva"
                        >
                          {foxpostTiltvaSzoveg(foxpostTiltottTetel, t)}
                        </span>
                      </span>
                    </div>
                    <FoxpostLogo className="ml-auto hidden h-[30px] w-auto shrink-0 small:block" />
                  </div>
                ) : null}
                {foxpostAktiv ? (
                  <FoxpostValaszto
                    key={shippingMethodId ?? ""}
                    kivalasztott={kosarPont ?? null}
                    onValaszt={(pont, forras) => handlePont(pont, forras)}
                  />
                ) : glsPontAktiv ? (
                  <GlsValaszto
                    key={shippingMethodId ?? ""}
                    optionId={glsPontAktiv.option_id}
                    nehez={glsPontAktiv.heavy}
                    automataNem={csakCsomagbolt}
                    cartId={cart?.id ?? null}
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
                <span className="text-[16px] font-medium leading-[26px] text-acr-ink">
                  {t("checkoutShipping.storeHeading")}
                </span>
                <span className="mb-4 text-[14px] leading-[22px] text-acr-slate">
                  {t("checkoutShipping.storeLead")}
                </span>
              </div>
              <div data-testid="delivery-options-container">
                <div className="pb-8 pt-2 small:pt-0">
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
                            MOD_KARTYA,
                            option.id === shippingMethodId
                              ? KIJELOLT_KARTYA
                              : KARTYA_KERET,
                            {
                              "cursor-not-allowed opacity-60":
                                option.insufficient_inventory,
                            },
                          )}
                        >
                          <div className="flex items-start gap-x-4">
                            <PenztarRadioJelolo
                              kijelolt={option.id === shippingMethodId}
                            />
                            <div className="flex flex-col">
                              <span className="text-[14px] leading-[22px] text-acr-ink">
                                {option.name}
                              </span>
                              <span className="text-[12px] leading-[18px] text-acr-slate">
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
                                    ?.address,
                                  locale,
                                )}
                              </span>
                              {option.insufficient_inventory && (
                                <span
                                  className="mt-1 text-[13px] leading-[18px] text-acr-ink"
                                  data-testid="bolti-atvetel-lista-tiltva"
                                >
                                  {boltiAtvetelTiltvaSzoveg(boltiHiany, t)}
                                </span>
                              )}
                            </div>
                          </div>
                          <span className="justify-self-end text-[14px] leading-[22px] text-acr-ink">
                            {arSzovegIde(option.amount!)}
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
            <PenztarGomb
              type="button"
              className="mt-2"
              onClick={handleSubmit}
              loading={isLoading}
              disabled={
                !cart.shipping_methods?.[0] ||
                kosarMod?.shipping_option_id !== shippingMethodId
              }
              data-testid="submit-delivery-option-button"
            >
              {t("checkoutShipping.toPayment")}
            </PenztarGomb>
          </div>
        </>
      ) : (
        <div>
          {cart && (cart.shipping_methods?.length ?? 0) > 0 && (
            <div className="flex flex-col">
              <p className="mb-1 text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate">
                {t("checkoutShipping.summaryMode")}
              </p>
              <p className="text-[14px] leading-[22px] text-acr-ink">
                {cart.shipping_methods!.at(-1)!.name}{" "}
                {arSzovegIde(cart.shipping_methods!.at(-1)!.amount!)}
              </p>
              {kosarPont?.name ? (
                // a valasztott pont a lezart lepesben is latszik (Foxpost-prompt 4. pont)
                <p
                  className="break-words text-[14px] leading-[22px] text-acr-ink"
                  data-testid="delivery-summary-point"
                >
                  {kosarPont.name}
                </p>
              ) : null}
            </div>
          )}
        </div>
      )}
    </section>
  )
}

export default Shipping
