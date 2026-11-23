"use client"

import { acceptTransferRequest, declineTransferRequest } from "@lib/data/orders"
import { Button, Heading, Text } from "@modules/common/components/ui"
import { useState } from "react"

export type TransferMode = "accept" | "decline"

/**
 * A MEGERŐSÍTÉS EGY GOMBNYOMÁSRA MEGY (kártya b9912381, barracuda 59870). Az elfogadás és az elutasítás ADATOT VÁLTOZTAT: a rendelés új tulajdonoshoz kerül, vagy az
 * átadás megszűnik. Ez a komponens egy GOMB mögött hívja a szerver-akciót (`lib/data/orders`, "use server": POST), az oldal pedig csak megjelenít. Egy GET-kérés
 * (a Next előtöltése, egy levélkliens előnézete, egy keresőrobot) így nem adhatja át a rendelést a vevő kattintása nélkül.
 */
const SZOVEG = {
  accept: {
    gomb: "Átvétel elfogadása",
    kesz: "A rendelés átkerült.",
    keszRendeles: (id: string) =>
      `A(z) ${id} rendelés sikeresen átkerült az új tulajdonoshoz.`,
    hiba: "Az átadás elfogadása nem sikerült. Próbáld meg újra.",
  },
  decline: {
    gomb: "Átvétel elutasítása",
    kesz: "Az átadást elutasítottad.",
    keszRendeles: (id: string) =>
      `A(z) ${id} rendelés átadását sikeresen elutasítottad.`,
    hiba: "Az átadás elutasítása nem sikerült. Próbáld meg újra.",
  },
} as const

/** A szerver-akció hívása elbukott: nem tudjuk, megtörtént-e az átadás, ezt mondjuk ki. */
const HALOZATI_HIBA =
  "Nem kaptunk választ, az átadás nem biztos, hogy megtörtént. Töltsd újra az oldalt, vagy próbáld meg újra."

type Allapot = "var" | "folyamatban" | "kesz" | "hiba"

export default function TransferConfirm({
  id,
  token,
  mode,
}: {
  id: string
  token: string
  mode: TransferMode
}) {
  const szoveg = SZOVEG[mode]
  const [allapot, setAllapot] = useState<Allapot>("var")
  const [hiba, setHiba] = useState<string | null>(null)

  const megerosit = async () => {
    if (allapot === "folyamatban") return
    setAllapot("folyamatban")
    setHiba(null)
    const kerelem =
      mode === "accept" ? acceptTransferRequest : declineTransferRequest
    // a szerver-akció HÍVÁSA is dobhat (hálózati hiba, telepítés utáni régi akció-azonosító): enélkül az állapot „folyamatban” maradna, a gomb örökre letiltva, hiba nélkül
    let success = false
    let error: string | null = null
    try {
      ;({ success, error } = await kerelem(id, token))
    } catch {
      error = HALOZATI_HIBA
    }
    if (success) {
      setAllapot("kesz")
      return
    }
    setHiba(error)
    setAllapot("hiba")
  }

  if (allapot === "kesz") {
    return (
      <div className="flex flex-col gap-y-6" data-testid="transfer-kesz">
        <Heading level="h1" className="text-xl text-zinc-900">
          {szoveg.kesz}
        </Heading>
        <Text className="text-zinc-600">{szoveg.keszRendeles(id)}</Text>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-y-4" data-testid="transfer-megerosites">
      {allapot === "hiba" && (
        <>
          <Text className="text-zinc-600">{szoveg.hiba}</Text>
          {hiba && <Text className="text-red-500">Hibaüzenet: {hiba}</Text>}
        </>
      )}
      <div>
        <Button
          size="large"
          variant={mode === "accept" ? "primary" : "secondary"}
          onClick={megerosit}
          isLoading={allapot === "folyamatban"}
          disabled={allapot === "folyamatban"}
          data-testid="transfer-gomb"
        >
          {szoveg.gomb}
        </Button>
      </div>
    </div>
  )
}
