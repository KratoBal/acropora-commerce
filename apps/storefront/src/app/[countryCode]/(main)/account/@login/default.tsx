import { redirect } from "next/navigation"

/**
 * A KIJELENTKEZETT VEVO A FIOK BARMELY ALOLDALAN A BELEPESRE JUT (2026-11-19, kirakat-kinezet
 * lista). A `account/layout.tsx` bejelentkezes nelkul a `login` helyet rajzolja, de annak
 * csak a `/account` gyokerre van oldala; a `/account/orders`, `/profile`, `/addresses` es a tobbi
 * helyen a hely ures volt, es a vevo "Nincs ilyen oldal"-t kapott 200-as allapottal, egy
 * mentett "Rendeleseim" linkre kattintva is. A `default.tsx` az ilyen helyen all be: a
 * belepo lapra iranyit. Bejelentkezett vevonel a layout a `login` helyet nem rajzolja, ez
 * a fajl nem fut le.
 */
export default async function BelepesreIranyit(props: {
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params
  redirect(`/${countryCode}/account`)
}
