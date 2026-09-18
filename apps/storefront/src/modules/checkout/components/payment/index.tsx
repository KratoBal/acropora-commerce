"use client"
import { RadioGroup } from "@headlessui/react"
import { isStripeLike, paymentInfoMap } from "@lib/constants"
import {
  FIZETESI_SZEREP_CIMKE,
  type EngedelyezettFizetesiMod,
  engedelyezettFizetesiModok,
} from "@lib/util/fizetesi-modok"
import { initiatePaymentSession } from "@lib/data/cart"
import { egyeztesdAzUtanvetDijat } from "@lib/data/payment"
import { convertToLocale } from "@lib/util/money"
import { FIZETES_MOST_NEM_SIKERULT } from "@lib/util/penztar-uzenet"
import { CheckCircleSolid, CreditCard } from "@medusajs/icons"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer, {
  StripePaymentContainer,
} from "@modules/checkout/components/payment-container"
import Divider from "@modules/common/components/divider"
import {
  Button,
  Container,
  Heading,
  Text,
  clx,
} from "@modules/common/components/ui"
import { HttpTypes } from "@medusajs/types"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback, useEffect, useState } from "react"

const Payment = ({
  cart,
  availablePaymentMethods,
  engedelyezettModok,
}: {
  cart: HttpTypes.StoreCart
  availablePaymentMethods: { id: string }[]
  /**
   * Amit a HATTER enged ennek a kosarnak, szerepekkel egyutt. A
   * `availablePaymentMethods` a regio kinalata, ami a szallitasi modrol semmit
   * nem tud -- a ketto metszete az, amit a vevo lathat.
   */
  engedelyezettModok: EngedelyezettFizetesiMod[]
}) => {
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

  const isOpen = searchParams.get("step") === "payment"

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

    try {
      const inditas = await initiatePaymentSession(cart, {
        provider_id: method,
      })

      if (!inditas.ok) {
        setError(inditas.uzenet)
        return
      }

      const egyeztetes = await egyeztesdAzUtanvetDijat(cart.id)

      if (!egyeztetes.ok) {
        setError(egyeztetes.uzenet)
        return
      }

      if (egyeztetes.valasztottSzerep === null) {
        const ujrainditas = await initiatePaymentSession(cart, {
          provider_id: method,
        })

        if (!ujrainditas.ok) {
          setError(ujrainditas.uzenet)
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
      setError(FIZETES_MOST_NEM_SIKERULT)
    }
  }

  const megjelenitheto = engedelyezettFizetesiModok(
    availablePaymentMethods,
    engedelyezettModok,
  )

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
          title: FIZETESI_SZEREP_CIMKE[mod.role],
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
          setError(eredmeny.uzenet)
          return
        }
      }

      if (!shouldInputPaymentDetails) {
        return router.push(
          pathname + "?" + createQueryString("step", "review"),
          {
            scroll: false,
          },
        )
      }
    } catch {
      /*
        AMI IDE ESIK, AZ MAR NEM A MUVELET VALASZA, HANEM EGY DOBAS. Annak az
        uzenetet produkcioban ugyis lecsereltek, tehat kiirni FELREVEZETO
        lenne: a sajat mondatunk megy ki helyette.
      */
      setError(FIZETES_MOST_NEM_SIKERULT)
    } finally {
      setIsLoading(false)
    }
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
                !isOpen && !paymentReady,
            },
          )}
        >
          Fizetés
          {!isOpen && paymentReady && <CheckCircleSolid />}
        </Heading>
        {!isOpen && paymentReady && (
          <Text>
            <button
              onClick={handleEdit}
              className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover"
              data-testid="edit-payment-button"
            >
              Szerkesztés
            </button>
          </Text>
        )}
      </div>
      <div>
        <div className={isOpen ? "block" : "hidden"}>
          {!paidByGiftcard && megjelenitheto.length > 0 && (
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
                      />
                    ) : (
                      <PaymentContainer
                        paymentInfoMap={cimkek}
                        paymentProviderId={paymentMethod.id}
                        selectedPaymentOptionId={selectedPaymentMethod}
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
            allapot ma valodi -- a bankkartyas szerephez nincs szolgaltato --,
            tehat nem elmeleti ag.
          */}
          {!paidByGiftcard && megjelenitheto.length === 0 && (
            <Text
              className="txt-medium text-ui-fg-subtle"
              data-testid="nincs-fizetesi-mod"
            >
              A választott szállítási módhoz jelenleg nincs elérhető fizetési
              mód. Válassz másik szállítási módot, vagy vedd fel velünk a
              kapcsolatot.
            </Text>
          )}

          {paidByGiftcard && (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Fizetési mód
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Ajándékkártya
              </Text>
            </div>
          )}

          {/*
            A DIJ CSAK AKKOR JELENIK MEG, HA A VEGPONT NEM NULLAT ADOTT.

            A kodban allo 450 forintos tartalek a HATTERE, nem a kirakate: ha
            a beallitasi sor hianyzik, a hatter dont rola es a valaszaban
            kuldi. Egy itt kiirt szam sajat talalgatas lenne, es penzrol.
          */}
          {utanvetDij > 0 && (
            <Text
              className="txt-medium text-ui-fg-subtle mt-4"
              data-testid="utanvet-dij"
            >
              Utánvét kezelési díj:{" "}
              {convertToLocale({
                amount: utanvetDij,
                currency_code: cart.currency_code,
              })}
              . A rendelés végösszege ezt tartalmazza.
            </Text>
          )}

          <ErrorMessage
            error={error}
            data-testid="payment-method-error-message"
          />

          <Button
            size="large"
            className="mt-6"
            onClick={handleSubmit}
            isLoading={isLoading}
            disabled={
              (isStripeLike(selectedPaymentMethod) && !paymentComplete) ||
              (!selectedPaymentMethod && !paidByGiftcard)
            }
            data-testid="submit-payment-button"
          >
            {!activeSession && isStripeLike(selectedPaymentMethod)
              ? "Add meg a fizetési adatokat"
              : "Tovább az ellenőrzéshez"}
          </Button>
        </div>

        <div className={isOpen ? "hidden" : "block"}>
          {cart && paymentReady && activeSession ? (
            <div className="flex items-start gap-x-1 w-full">
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Fizetési mód
                </Text>
                <Text
                  className="txt-medium text-ui-fg-subtle"
                  data-testid="payment-method-summary"
                >
                  {cimkek[activeSession?.provider_id]?.title ||
                    activeSession?.provider_id}
                </Text>
              </div>
              <div className="flex flex-col w-1/3">
                <Text className="txt-medium-plus text-ui-fg-base mb-1">
                  Fizetés részletei
                </Text>
                <div
                  className="flex gap-2 txt-medium text-ui-fg-subtle items-center"
                  data-testid="payment-details-summary"
                >
                  <Container className="flex items-center h-7 w-fit p-2 bg-ui-button-neutral-hover">
                    {cimkek[selectedPaymentMethod]?.icon || <CreditCard />}
                  </Container>
                  <Text>Megjelenik a következő lépés</Text>
                </div>
              </div>
            </div>
          ) : paidByGiftcard ? (
            <div className="flex flex-col w-1/3">
              <Text className="txt-medium-plus text-ui-fg-base mb-1">
                Fizetési mód
              </Text>
              <Text
                className="txt-medium text-ui-fg-subtle"
                data-testid="payment-method-summary"
              >
                Ajándékkártya
              </Text>
            </div>
          ) : null}
        </div>
      </div>
      <Divider className="mt-8" />
    </div>
  )
}

export default Payment
