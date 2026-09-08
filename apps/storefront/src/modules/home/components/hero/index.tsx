import { Heading } from "@modules/common/components/ui"

import { STORE_NAME } from "@lib/store"

/**
 * A FOOLDAL FEJLECE.
 *
 * A starterben itt a SAJAT markaja allt ("Ecommerce Starter Template",
 * "Powered by Medusa and Next.js") es egy GitHub-gomb a starter repojara.
 * Az a harom a mi vevonknek jelent volna meg, ezert kikerult.
 *
 * AMI HELYETTE ALL, AZ SZANDEKOSAN A LEGKEVESEBB: a bolt neve. A fooldal
 * tartalma (kep, uzenet, kiemelt termekek) MEG NINCS ELDONTVE, es egy
 * kitalalt marketing-mondat pontosan ugy utazna tovabb, mint a starter sajat
 * szovege.
 */
const Hero = () => {
  return (
    <div className="h-[45vh] w-full border-b border-ui-border-base relative bg-ui-bg-subtle">
      <div className="absolute inset-0 z-10 flex flex-col justify-center items-center text-center small:p-32 gap-6">
        <Heading
          level="h1"
          className="text-3xl leading-10 text-ui-fg-base font-normal"
        >
          {STORE_NAME}
        </Heading>
      </div>
    </div>
  )
}

export default Hero
