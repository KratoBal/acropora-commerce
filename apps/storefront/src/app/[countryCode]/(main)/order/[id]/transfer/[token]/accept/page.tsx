import { Heading, Text } from "@modules/common/components/ui"
import TransferConfirm from "@modules/order/components/transfer-confirm"
import TransferImage from "@modules/order/components/transfer-image"

/**
 * AZ ELFOGADÁS OLDALA CSAK MEGJELENÍT (kártya b9912381): az átvétel a gomb megnyomására megy (`TransferConfirm`, szerver-akció), NEM a lap renderelésekor. Egy GET-kérés
 * (előtöltés, levélkliens-előnézet, robot) nem adhatja át a rendelést.
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
          Elfogadod a rendelés átvételét?
        </Heading>
        <Text className="text-zinc-600">
          A(z) {id} rendelés átvételét akkor fogadjuk el, amikor megnyomod az
          alábbi gombot.
        </Text>
        <TransferConfirm id={id} token={token} mode="accept" />
      </div>
    </div>
  )
}
