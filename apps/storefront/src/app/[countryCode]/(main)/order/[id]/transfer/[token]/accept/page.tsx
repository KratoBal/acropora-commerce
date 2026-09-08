import { acceptTransferRequest } from "@lib/data/orders"
import { Heading, Text } from "@modules/common/components/ui"
import TransferImage from "@modules/order/components/transfer-image"

export default async function TransferPage({
  params,
}: {
  params: { id: string; token: string }
}) {
  const { id, token } = params

  const { success, error } = await acceptTransferRequest(id, token)

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        {success && (
          <>
            <Heading level="h1" className="text-xl text-zinc-900">
              A rendelés átkerült.
            </Heading>
            <Text className="text-zinc-600">
              A(z) {id} rendelés sikeresen átkerült az új tulajdonoshoz.
            </Text>
          </>
        )}
        {!success && (
          <>
            <Text className="text-zinc-600">
              Az átadás elfogadása nem sikerült. Próbáld meg újra.
            </Text>
            {error && <Text className="text-red-500">Hibaüzenet: {error}</Text>}
          </>
        )}
      </div>
    </div>
  )
}
