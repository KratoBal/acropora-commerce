import { Heading, Text } from "@modules/common/components/ui"
import TransferConfirm from "@modules/order/components/transfer-confirm"
import TransferImage from "@modules/order/components/transfer-image"

/**
 * AZ ELUTASÍTÁS OLDALA CSAK MEGJELENÍT (kártya b9912381): az elutasítás a gomb megnyomására megy (`TransferConfirm`, szerver-akció), NEM a lap renderelésekor. Egy
 * GET-kérés (előtöltés, levélkliens-előnézet, robot) nem szüntetheti meg az átadást.
 */
export default async function TransferPage({
  params,
}: {
  params: Promise<{ id: string; token: string }>
}) {
  const { id, token } = await params

  return (
    <div className="flex flex-col gap-y-4 items-start w-2/5 mx-auto mt-10 mb-20">
      <TransferImage />
      <div className="flex flex-col gap-y-6">
        <Heading level="h1" className="text-xl text-zinc-900">
          Elutasítod a rendelés átvételét?
        </Heading>
        <Text className="text-zinc-600">
          A(z) {id} rendelés átadását akkor utasítjuk el, amikor megnyomod az
          alábbi gombot.
        </Text>
        <TransferConfirm id={id} token={token} mode="decline" />
      </div>
    </div>
  )
}
