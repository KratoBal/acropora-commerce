import { retrieveCustomer } from "@lib/data/customer"
// TODO: Re-add Toaster component when needed
import AccountLayout from "@modules/account/templates/account-layout"

export default async function AccountPageLayout({
  dashboard,
  login,
}: {
  dashboard?: React.ReactNode
  login?: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)

  /*
    BEJELENTKEZES NELKUL a belepo lap a sajat, teljes szelessegu alapjan all
    (P5, 256:3): a fiok kerete (oldalmenu, "Kérdésed van?" sav) csak a
    bejelentkezett vevonek szol.
  */
  if (!customer) return login

  return (
    <AccountLayout customer={customer}>
      {dashboard}
      {/* TODO: Re-add Toaster component when needed */}
    </AccountLayout>
  )
}
