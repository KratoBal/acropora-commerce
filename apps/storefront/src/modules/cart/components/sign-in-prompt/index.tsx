import { Button, Heading, Text } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * A HAROM UTOLSO ANGOL FELIRAT A KOSAR MAPPAJABAN.
 *
 * A kirakat tobbi angol felirata ma este magyarra kerult (47 fajl), es a kosar
 * mappaja SZANDEKOSAN maradt ki, mert itt kulon munka folyt. Ez a harom mondat
 * a maradek.
 *
 * A TEGEZO ALAK a szomszedos szovegekbol jon, nem izlesbol: "A fotón pontosan
 * ezt a példányt látod: ez kerül a kosaradba", "Hová tedd ezt a példányt?".
 *
 * === ES A MASODIK MONDAT EGY IGERET, EZERT LEMERTEM ===
 *
 * A "gyorsabban végzel" allitas, nem hangulat -- es igaz: a bejelentkezett vevo
 * mentett cimeit a fizetesi lepes felkinalja (`AddressSelect`, a regiora
 * szurve), az email cimet pedig magatol kitolti. Vagyis a bejelentkezes
 * TENYLEGESEN rovidebb utat ad.
 *
 * Az eredeti "Sign in for a better experience" ennel homalyosabb volt: nem
 * mondott semmit arrol, MITOL lesz jobb.
 */

const SignInPrompt = () => {
  return (
    <div className="bg-white flex items-center justify-between">
      <div>
        <Heading level="h2" className="txt-xlarge">
          Van már fiókod?
        </Heading>
        <Text className="txt-medium text-ui-fg-subtle mt-2">
          Jelentkezz be, és gyorsabban végzel.
        </Text>
      </div>
      <div>
        <LocalizedClientLink href="/account">
          <Button
            variant="secondary"
            className="h-10"
            data-testid="sign-in-button"
          >
            Bejelentkezés
          </Button>
        </LocalizedClientLink>
      </div>
    </div>
  )
}

export default SignInPrompt
