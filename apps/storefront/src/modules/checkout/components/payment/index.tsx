"use client"
import { RadioGroup } from "@headlessui/react"
import { isStripeLike, paymentInfoMap } from "@lib/constants"
import {
  type EngedelyezettFizetesiMod,
  engedelyezettFizetesiModok,
  fizetesiModAlcim,
  fizetesiModCimke,
} from "@lib/util/fizetesi-modok"
import { STRIPE_PUBLIKUS_KULCS } from "@lib/util/stripe-kulcs"
import {
  initiatePaymentSession,
  placeOrder,
  mentsRendelesiNyelvet,
  rogzitsAszfElfogadast,
} from "@lib/data/cart"
import { egyeztesdAzUtanvetDijat } from "@lib/data/payment"
import { valasszKartyatVegyesKosarra } from "@lib/data/stripe"
import { convertToLocale } from "@lib/util/money"
import { useLocale, useTranslate } from "@lib/i18n/use-translate"
import { hibaSzoveg } from "@lib/util/penztar-hiba"
import { type StripeAllapot, stripeGombFelirat } from "@lib/util/stripe-allapot"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripePaymentContainer,
} from "@modules/checkout/components/payment-container"
import {
  STRIPE_CTA_OSZTALY,
  StripeKozosGomb,
  StripePaymentButton,
} from "@modules/checkout/components/payment-button"
import StripeAllapotPanel from "@modules/checkout/components/stripe-allapot"
import ExpressFizetes from "@modules/checkout/components/payment-button/express"
import { StripeContext } from "@modules/checkout/components/payment-wrapper/stripe-wrapper"
import { Button, clx } from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import {
  unstable_rethrow,
  usePathname,
  useRouter,
  useSearchParams,
} from "next/navigation"
import { useCallback, useContext, useEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import { useAszf } from "@modules/checkout/components/aszf-elfogadas"
import { PENZTAR_CTA_HELY } from "@modules/checkout/components/rendelesed"

const KICSI_CIM =
  "mb-1 text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate"
const SOR = "text-[14px] leading-[22px] text-acr-ink"

const Payment = ({
  cart,
  availablePaymentMethods,
  engedelyezettModok,
  vegyes = false,
  oldal = false,
  halasztott = false,
}: {
  /**
   * Minden kartyas fizetes a halasztott uton megy (acrobot 26333, A ut): a
   * valasztas a munkamenetet leveszi (`card-choose`), az intent a kattintaskor
   * keszul (`stripe-start`), az ASZF-rekord utan. A vegyes kosar mar igy ment.
   */
  halasztott?: boolean
  /**
   * A Figma szerinti fizetesi oldalon (209:3): a lap cime a kartyae, a
   * cselekvo gomb az osszesitobe kerul (`PENZTAR_CTA_HELY`), es az ASZF pipa
   * nelkul tiltva all. Nelkule a regi, lepesenkenti penztar viselkedese.
   */
  oldal?: boolean
  cart: HttpTypes.StoreCart
  /** A kosár vegyes: a Stripe ilyenkor a halasztott úton fizet (lásd lent). */
  vegyes?: boolean
  availablePaymentMethods: { id: string }[]
  /**
   * Amit a HATTER enged ennek a kosarnak, szerepekkel egyutt. A
   * `availablePaymentMethods` a regio kinalata, ami a szallitasi modrol semmit
   * nem tud -- a ketto metszete az, amit a vevo lathat.
   */
  engedelyezettModok: EngedelyezettFizetesiMod[]
}) => {
  const t = useTranslate()
  const locale = useLocale()
  /*
    A FIZETES INDITASA ELOTT KET DOLOG A KOSARRA KERUL: a vevo nyelve (a
    levelek ezen mennek; hiba eseten nem allitja meg a fizetest, a rendeles
    magyar levelet kap) es az ASZF elfogadasa (ez megallit, ha elmarad).
  */
  const fizetesElott = async () => {
    await mentsRendelesiNyelvet(cart.id, locale)
    return rogzitsAszfElfogadast(cart.id)
  }
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (paymentSession) => paymentSession.status === "pending",
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentComplete, setPaymentComplete] = useState(false)
  /**
   * A DIJ A HATTER VALASZABOL JON, ES CSAK ONNAN. Nulla addig, amig a vegpont
   * nem mond mast -- a kirakat nem ir ki osszeget sajat talalgatasbol.
   */
  const [utanvetDij, setUtanvetDij] = useState(0)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? "",
  )

  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()

  const isOpen = oldal || searchParams.get("step") === "payment"
  const { elfogadva: aszfElfogadva } = useAszf()
  /*
    A GOMB HELYE AZ OSSZESITOBEN: a fizetesi resz rajzolja oda (portal), igy a
    Stripe kornyezete (Elements) es ez az allapot a gombbal marad. A hely a
    megjelenes utan derul ki; addig a gomb itt all.
  */
  const [ctaHely, setCtaHely] = useState<HTMLElement | null>(null)
  useEffect(() => {
    if (oldal) setCtaHely(document.getElementById(PENZTAR_CTA_HELY))
  }, [oldal])

  /*
    A STRIPE-FIZETES ALLAPOTA (a keretek 477:*): a gomb jelzi, a panel mutatja.
    A 3DS utani visszateres (`payment-return`) az URL-ben hozza:
      ellenorzes=1          a bank jovahagyta, a leadas most jon ("Ellenőrzés…")
      redirect_status=failed a bank elutasitotta ("Próbáld újra")
  */
  const [stripeAllapot, setStripeAllapot] = useState<StripeAllapot>(() =>
    searchParams.get("ellenorzes") === "1"
      ? "ellenorzes"
      : searchParams.get("redirect_status") === "failed"
        ? "elutasitva"
        : "alap",
  )

  /*
    AZ ELSO AG EDDIG NEMA VOLT, ES EZ KULON HIBA A HATAR-HIBA MELLETT.

    A hivas `await`-tel allt, `catch` NELKUL: ha a fizetesi munkamenet
    inditasa elhasalt, a felulet kivalasztottnak mutatta a modot, es a vevo
    semmilyen jelet nem kapott. A kudarc csak a KOVETKEZO lepesnel derult
    volna ki. Most ugyanoda ir, ahova a masik ag.
  */
  /**
   * A VALASZTAS HAROM LEPES, ES A SORREND KOTOTT.
   *
   * 1. munkamenet a valasztott szolgaltatoval -- a hatter EBBOL tudja meg,
   *    mire esett a valasztas. Dij-jelzo mezot nem kuldunk: az azt jelentene,
   *    hogy a kirakat mondja meg, mennyit kell fizetni.
   * 2. egyeztetes: felkerul az utanvet-dij, vagy lekerul, ha a vevo masra
   *    valtott. MINDEN modnal lefut, nem csak az utanvetnel -- kulonben egy
   *    utanvetrol kartyara valto vevonel a dij ottmaradna.
   * 3. ha a dij mozdult, a vegosszeg is mozdult, es a Medusa eldobja a
   *    munkamenetet. A valasz `valasztottSzerep: null` ertekkel EZT mondja
   *    meg, es ilyenkor ujra kell inditani -- most mar az uj vegosszegre.
   *
   * A harmadik lepes nelkul a lanc NEM HIBAZIK, csak elromlik: a vevo latna a
   * dijat, es a fizetese kozben tunne el alola a munkamenet.
   */
  const setPaymentMethod = async (method: string) => {
    setError(null)
    setSelectedPaymentMethod(method)
    setUtanvetDij(0)
    setStripeAllapot("alap")

    /*
      A VEGYES KOSAR STRIPE-FIZETESE MEG NEM INDIT FIZETEST: a kosar bontasa es
      a kozos PaymentIntent a leadaskor keszul. A hatter MOST leveszi a korabbi
      munkamenetet es az utanvet-dijat (`card-choose`), mert a leado gomb a
      redesign ota ugyanebben a lepesben all (a keretek szerint), es a mezo
      alatt mar a kartyaval fizetendo osszegnek kell latszania. Minden mas
      modnak MOST kell a munkamenet: a Stripe mezo abbol kapja a titkat.
    */
    if (stripeKozosE(method)) {
      try {
        const eredmeny = await valasszKartyatVegyesKosarra(cart.id)
        if (!eredmeny.ok) {
          setError(hibaSzoveg(t, eredmeny))
          return
        }
        router.refresh()
      } catch {
        setError(t("checkoutPayment.errPaymentFailed"))
      }
      return
    }

    try {
      const inditas = await initiatePaymentSession(cart, {
        provider_id: method,
      })

      if (!inditas.ok) {
        setError(hibaSzoveg(t, inditas))
        return
      }

      const egyeztetes = await egyeztesdAzUtanvetDijat(cart.id)

      if (!egyeztetes.ok) {
        setError(hibaSzoveg(t, egyeztetes))
        return
      }

      if (egyeztetes.valasztottSzerep === null) {
        const ujrainditas = await initiatePaymentSession(cart, {
          provider_id: method,
        })

        if (!ujrainditas.ok) {
          setError(hibaSzoveg(t, ujrainditas))
          return
        }
      }

      setUtanvetDij(egyeztetes.dij)
      /*
        A DIJ SOR A KOSARON KELETKEZIK, tehat a szerver-komponensek adata
        elavult: az osszegzo a dij nelkuli vegosszeget mutatna. A frissites
        ujraolvastatja oket.
      */
      router.refresh()
    } catch {
      setError(t("checkoutPayment.errPaymentFailed"))
    }
  }

  // Stripe publikus kulcs nelkul a kartyamezo nem toltodne be: a mod akkor
  // nem jelenik meg (`stripe-kulcs.ts`).
  const megjelenitheto = engedelyezettFizetesiModok(
    availablePaymentMethods,
    engedelyezettModok,
  ).filter((mod) => STRIPE_PUBLIKUS_KULCS || !isStripeLike(mod.id))

  /*
    VEGYES KOSÁR STRIPE-PAL (Balázs 2026-10-01, 1-es út): a kártyamező
    halasztott (a burok adja), munkamenet itt nem indul; a kosár bontása és a
    két rendelés közös fizetése a leadáskor jön (`StripeKozosGomb`).
  */
  function stripeKozosE(mod: string) {
    return (vegyes || halasztott) && isStripeLike(mod)
  }
  const stripeKozosValasztva = stripeKozosE(selectedPaymentMethod)

  /**
   * A CIMKE A SZEREPBOL JON, NEM AZ AZONOSITOBOL.
   *
   * A `paymentInfoMap` a Medusa-sablon terkepe, es a sajat szolgaltatonk nincs
   * benne: azon az uton a vevo a nyers `pp_acropora_cod` szoveget olvasna a
   * radiogomb mellett. A szerep viszont megerkezik a hatter valaszaban, es az
   * mondja meg, MIT valaszt a vevo. A terkep tovabbra is ott all mogotte, hogy
   * a beepitett szolgaltatok ikonja megmaradjon.
   */
  const cimkek = {
    ...paymentInfoMap,
    ...Object.fromEntries(
      megjelenitheto.map((mod) => [
        mod.id,
        {
          title: fizetesiModCimke(mod, t),
          icon: paymentInfoMap[mod.id]?.icon ?? <CreditCard />,
        },
      ]),
    ),
  }

  const paidByGiftcard = !!(
    (cart as unknown as Record<string, unknown>)?.gift_cards &&
    ((cart as unknown as Record<string, unknown>)?.gift_cards as unknown[])
      ?.length > 0 &&
    cart?.total === 0
  )

  const paymentReady =
    (activeSession && (cart?.shipping_methods?.length ?? 0) !== 0) ||
    paidByGiftcard

  /**
   * Az ellenorzes lepesenek cime. A `fizetes` jelzes minden mas modnal LE KELL
   * KERULJON: a bankkartya leado gombja a redesign ota a fizetesi lepesben
   * all, az ellenorzesre csak a tobbi mod jut.
   */
  const ellenorzesUrl = () => {
    const params = new URLSearchParams(searchParams)
    params.set("step", "review")
    params.delete("fizetes")
    return params.toString()
  }

  const createQueryString = useCallback(
    (name: string, value: string) => {
      const params = new URLSearchParams(searchParams)
      params.set(name, value)

      return params.toString()
    },
    [searchParams],
  )

  const handleEdit = () => {
    router.push(pathname + "?" + createQueryString("step", "payment"), {
      scroll: false,
    })
  }

  const handleSubmit = async () => {
    setIsLoading(true)
    try {
      // a fizetesi oldalon az ASZF a kosarra kerul, mielott tovabblepunk
      if (oldal) {
        const rogzites = await fizetesElott()
        if (!rogzites.ok) {
          setError(hibaSzoveg(t, rogzites))
          return
        }
      }
      const shouldInputPaymentDetails =
        isStripeLike(selectedPaymentMethod) && !activeSession

      const checkActiveSession =
        activeSession?.provider_id === selectedPaymentMethod

      if (!checkActiveSession) {
        /*
          A HIBA A MUVELET VALASZABOL JON, NEM A KIVETELBOL. Produkcioban a
          Next a szerver-muveletbol DOBOTT hiba uzenetet lecsereli egy
          altalanos angol mondatra (#371); egy VISSZAADOTT ertek atmegy.

          ES A VISSZATERES ITT LENYEGI: sikertelen inditas utan NEM szabad
          tovabblepni a „review" lepesre, mert ott mar nincs mit fizetni.
        */
        const eredmeny = await initiatePaymentSession(cart, {
          provider_id: selectedPaymentMethod,
        })

        if (!eredmeny.ok) {
          setError(hibaSzoveg(t, eredmeny))
          return
        }
      }

      if (!shouldInputPaymentDetails) {
        return router.push(pathname + "?" + ellenorzesUrl(), {
          scroll: false,
        })
      }
    } catch {
      /*
        AMI IDE ESIK, AZ MAR NEM A MUVELET VALASZA, HANEM EGY DOBAS. Annak az
        uzenetet produkcioban ugyis lecsereltek, tehat kiirni FELREVEZETO
        lenne: a sajat mondatunk megy ki helyette.
      */
      setError(t("checkoutPayment.errPaymentFailed"))
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    setError(null)
  }, [isOpen])

  /*
    A 3DS UTANI ELLENORZES (477:619 / 477:1217): a `payment-return` utvonal mar
    ellenorizte, hogy a visszaterites ehhez a kosarhoz es munkamenethez
    tartozik, es hogy a bank jovahagyta. A leadas itt jon, a vevo pedig addig a
    "Fizetés ellenőrzése…" allapotot latja, nem a sima penztarat. Siker eseten
    a `placeOrder` atiranyit a visszaigazolo lapra; ha visszater, az kudarc.
  */
  const ellenorzesFut = useRef(false)
  useEffect(() => {
    if (stripeAllapot !== "ellenorzes" || ellenorzesFut.current) {
      return
    }
    ellenorzesFut.current = true
    placeOrder()
      .then((eredmeny) => {
        if (!eredmeny.ok) {
          setError(hibaSzoveg(t, eredmeny))
          setStripeAllapot("alap")
        }
      })
      .catch((hiba) => {
        unstable_rethrow(hiba)
        setError(t("checkoutPayment.errOrderFailed"))
        setStripeAllapot("alap")
      })
  }, [stripeAllapot, t])

  /** Az "Egy fizetés" sor: mindig a kosar teljes fizetendo osszege. */
  const egyFizetes = t(
    vegyes && stripeKozosValasztva
      ? "checkoutPayment.onePaymentBoth"
      : "checkoutPayment.onePayment",
    {
      amount: convertToLocale({
        amount: cart.total ?? 0,
        currency_code: cart.currency_code,
      }),
    },
  )
  const stripeValasztva = isStripeLike(selectedPaymentMethod) && !paidByGiftcard
  /*
    A GOMB A STRIPE KORNYEZETEBEN ELHET CSAK (`useStripe`). A nem bontott
    kosarnal a munkamenet a valasztas UTAN keszul el, es a burok csak akkor
    adja az Elements-et; addig egy letiltott helyorzo all a helyen.
  */
  const stripeKesz = useContext(StripeContext)
  const nemKesz =
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  /*
    A CSELEKVO GOMB BLOKKJA. Oldal-modban az osszesitobe kerul, a valasztott
    mod cimkejevel ("Fizetés: Bankkártya"), es az ASZF pipa nelkul tiltva all.
  */
  const nemElfogadva = oldal && !aszfElfogadva
  // a fizetesi oldalon a pipa a kosarra kerul, mielott barmilyen fizetes indul
  const aszfRogzites = oldal ? fizetesElott : undefined
  const ctaOsztaly = oldal
    ? `${STRIPE_CTA_OSZTALY} small:!w-full small:!min-w-0`
    : STRIPE_CTA_OSZTALY
  const gombBlokk = (tartalom: React.ReactNode) =>
    oldal && ctaHely ? createPortal(tartalom, ctaHely) : tartalom

  return (
    <div
      className={
        oldal
          ? undefined
          : "border border-acr-line bg-acr-white px-4 py-5 small:px-6 small:py-6"
      }
    >
      <div
        className={clx("mb-4 flex flex-row items-center justify-between", {
          hidden: oldal,
        })}
      >
        <h2
          className={clx(
            "flex flex-row items-center gap-x-2 text-[22px] font-normal leading-[28px] text-acr-ink small:text-[26px] small:leading-[32px]",
            {
              "pointer-events-none select-none opacity-50":
                !isOpen && !paymentReady,
            },
          )}
        >
          {t("checkoutPayment.paymentLabel")}
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </h2>
        {!isOpen && paymentReady && (
          <button
            onClick={handleEdit}
            className="text-[14px] font-medium leading-[22px] text-acr-ocean underline"
            data-testid="edit-payment-button"
          >
            {t("checkoutPayment.edit")}
          </button>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {/*
            A 3DS UTANI ELLENORZES (477:619 / 477:1217): a munkamenet ekkor mar
            nem "pending", tehat a kartyamezo nem allna; a panel onalloan all,
            a gomb "Ellenőrzés…", es a leadas a fenti hatasban fut.
          */}
          {stripeAllapot === "ellenorzes" && (
            <div
              className="relative mb-3 min-h-[180px] border border-acr-line bg-acr-white"
              data-testid="stripe-ellenorzes-blokk"
            >
              <StripeAllapotPanel allapot="ellenorzes" />
            </div>
          )}
          {stripeAllapot === "ellenorzes" && (
            <Button size="large" className="mt-4" disabled aria-busy>
              {stripeGombFelirat("ellenorzes", t)}
            </Button>
          )}
          {stripeAllapot !== "ellenorzes" &&
            !paidByGiftcard &&
            megjelenitheto.length > 0 && (
              <>
                <RadioGroup
                  value={selectedPaymentMethod}
                  onChange={(value: string) => setPaymentMethod(value)}
                >
                  {megjelenitheto.map((paymentMethod) => (
                    <div key={paymentMethod.id}>
                      {isStripeLike(paymentMethod.id) ? (
                        <StripePaymentContainer
                          paymentProviderId={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          paymentInfoMap={cimkek}
                          setError={setError}
                          setPaymentComplete={setPaymentComplete}
                          egyFizetes={egyFizetes}
                          allapot={
                            <StripeAllapotPanel allapot={stripeAllapot} />
                          }
                          express={
                            oldal && stripeKesz ? (
                              <ExpressFizetes
                                cart={cart}
                                elotte={aszfRogzites}
                                vegyes={!!stripeKozosValasztva}
                                tiltva={nemElfogadva}
                                onAllapot={setStripeAllapot}
                                onHiba={setError}
                              />
                            ) : undefined
                          }
                        />
                      ) : (
                        <PaymentContainer
                          paymentInfoMap={cimkek}
                          paymentProviderId={paymentMethod.id}
                          selectedPaymentOptionId={selectedPaymentMethod}
                          alcim={fizetesiModAlcim(paymentMethod, t)}
                        />
                      )}
                    </div>
                  ))}
                </RadioGroup>
              </>
            )}

          {/*
            AZ URES LISTA NEM URES KEPERNYO.

            Eddig a `&&` miatt SEMMI nem jelent meg: a vevo egy cim nelkuli,
            letiltott gombos lepest latott, es nem tudta, rajta mulik-e. Ez az
            allapot valodi lehet (STRIPE_API_KEY nelkul a bankkartyas szerephez
            nincs szolgaltato), tehat nem elmeleti ag.
          */}
          {!paidByGiftcard && megjelenitheto.length === 0 && (
            <p className={SOR} data-testid="nincs-fizetesi-mod">
              {t("checkoutPayment.noMode")}
            </p>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col">
              <p className={KICSI_CIM}>{t("checkoutPayment.summaryMode")}</p>
              <p className={SOR} data-testid="payment-method-summary">
                {t("checkoutPayment.giftCard")}
              </p>
            </div>
          )}

          {/*
            A DIJ CSAK AKKOR JELENIK MEG, HA A VEGPONT NEM NULLAT ADOTT.

            A kodban allo 450 forintos tartalek a HATTERE, nem a kirakate: ha
            a beallitasi sor hianyzik, a hatter dont rola es a valaszaban
            kuldi. Egy itt kiirt szam sajat talalgatas lenne, es penzrol.
          */}
          {utanvetDij > 0 && (
            <p className={clx(SOR, "mt-4")} data-testid="utanvet-dij">
              {t("checkoutPayment.codFee", {
                amount: convertToLocale({
                  amount: utanvetDij,
                  currency_code: cart.currency_code,
                }),
              })}
            </p>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          {/*
            A BANKKARTYA LEADO GOMBJA A FIZETESI LEPESBEN ALL (a keretek
            szerint: a mezo, a bizalmi mondat es a megrendel gomb egy
            nezetben). Mobilon a kepernyo aljara ragad, a fizetendo osszeggel;
            a helyfoglalo alatta azert van, hogy a ragado sav ne takarja el az
            oldal aljat. A tobbi mod utja (Tovább az ellenőrzéshez) valtozatlan.
          */}
          {stripeAllapot === "ellenorzes"
            ? null
            : stripeValasztva && isOpen
              ? gombBlokk(
                  <>
                    {oldal ? (
                      <p
                        className="flex items-center gap-2 border-l-2 border-acr-heritage bg-acr-mist px-3 py-2 text-[13px] text-acr-slate"
                        data-testid="valasztott-fizetes"
                      >
                        {t("checkoutPayment.paymentLabel")}
                        <span className="font-medium text-acr-ink">
                          {t("checkoutPayment.cardShort")}
                        </span>
                      </p>
                    ) : (
                      <p className={clx(SOR, "mt-6")}>
                        {t("checkoutPayment.reviewConfirm")}
                      </p>
                    )}
                    <div
                      className={clx(
                        "fixed inset-x-0 bottom-0 z-40 flex items-center gap-x-4 border-t border-acr-line bg-acr-white px-4 py-3 small:static small:border-0 small:bg-transparent small:p-0",
                        !oldal && "small:mt-4",
                      )}
                      data-testid="stripe-cta-sav"
                    >
                      <div className="min-w-0 flex-1 small:hidden">
                        <p className="text-[12px] leading-[16px] text-acr-slate">
                          {t("checkoutPayment.cardShort")}
                        </p>
                        <p className="text-[16px] font-semibold leading-[22px] text-acr-ink">
                          {convertToLocale({
                            amount: cart.total ?? 0,
                            currency_code: cart.currency_code,
                          })}
                        </p>
                      </div>
                      <div
                        className={clx(
                          "flex-1",
                          oldal ? "small:w-full" : "small:flex-none",
                        )}
                      >
                        {!stripeKesz ? (
                          <Button
                            size="large"
                            disabled
                            className={ctaOsztaly}
                            data-testid="submit-order-button"
                          >
                            {stripeGombFelirat("alap", t)}
                          </Button>
                        ) : stripeKozosValasztva ? (
                          <StripeKozosGomb
                            cart={cart}
                            elotte={aszfRogzites}
                            notReady={nemKesz || nemElfogadva}
                            data-testid="submit-order-button"
                            onAllapot={setStripeAllapot}
                            kezdoAllapot={stripeAllapot}
                            className={ctaOsztaly}
                          />
                        ) : (
                          <StripePaymentButton
                            cart={cart}
                            elotte={aszfRogzites}
                            notReady={nemKesz || !activeSession || nemElfogadva}
                            data-testid="submit-order-button"
                            onAllapot={setStripeAllapot}
                            kezdoAllapot={stripeAllapot}
                            className={ctaOsztaly}
                          />
                        )}
                      </div>
                    </div>
                    {nemElfogadva ? (
                      <p
                        className="text-[12px] text-acr-slate"
                        data-testid="aszf-hianyzik"
                      >
                        {t("checkoutPayment.aszfMissing")}
                      </p>
                    ) : null}
                    <div className="h-[76px] small:hidden" aria-hidden="true" />
                  </>,
                )
              : gombBlokk(
                  <Button
                    size="large"
                    className={oldal ? "w-full" : "mt-6"}
                    onClick={handleSubmit}
                    isLoading={isLoading}
                    disabled={
                      nemElfogadva ||
                      (isStripeLike(selectedPaymentMethod) &&
                        !paymentComplete) ||
                      (!selectedPaymentMethod && !paidByGiftcard)
                    }
                    data-testid="submit-payment-button"
                  >
                    {t("checkoutPayment.toReview")}
                  </Button>,
                )}
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="grid grid-cols-1 gap-4 small:grid-cols-2">
              <div className="flex flex-col">
                <p className={KICSI_CIM}>{t("checkoutPayment.summaryMode")}</p>
                <p className={SOR} data-testid="payment-method-summary">
                  {cimkek[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </p>
              </div>
              <div className="flex flex-col">
                <p className={KICSI_CIM}>
                  {t("checkoutPayment.summaryDetails")}
                </p>
                <div
                  className={clx(SOR, "flex items-center gap-2")}
                  data-testid="payment-details-summary"
                >
                  <span className="flex h-7 w-fit items-center border border-acr-line p-2">
                    {cimkek[selectedPaymentMethod]?.icon || <CreditCard />}
                  </span>
                  <p>{t("checkoutPayment.summaryNext")}</p>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col">
              <p className={KICSI_CIM}>{t("checkoutPayment.summaryMode")}</p>
              <p className={SOR} data-testid="payment-method-summary">
                {t("checkoutPayment.giftCard")}
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}

export default Payment
