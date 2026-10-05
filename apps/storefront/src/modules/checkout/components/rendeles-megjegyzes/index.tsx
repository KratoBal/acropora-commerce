"use client"

import {
  FUTAR_MEGJEGYZES_MAX,
  type Megjegyzesek,
  VEVO_MEGJEGYZES_MAX,
} from "@lib/util/megjegyzes"
import { Label, Text } from "@modules/common/components/ui"

type Props = {
  ertek: Megjegyzesek
  valtozik: (ertek: Megjegyzesek) => void
  /** A futarnak szolo mezo csak hazhoz szallitasnal latszik. */
  hazhoz: boolean
}

const MEZO =
  "block w-full px-4 py-3 bg-ui-bg-field border rounded-md focus:outline-none focus:ring-0 focus:shadow-borders-interactive-with-active border-ui-border-base hover:bg-ui-bg-field-hover txt-compact-medium resize-y"

function Mezo({
  id,
  cimke,
  ertek,
  max,
  sorok,
  valtozik,
}: {
  id: string
  cimke: string
  ertek: string
  max: number
  sorok: number
  valtozik: (ertek: string) => void
}) {
  return (
    <div className="flex flex-col gap-y-2">
      <Label htmlFor={id} className="txt-compact-medium-plus">
        {cimke}{" "}
        <span className="text-ui-fg-muted txt-compact-small">
          (nem kötelező)
        </span>
      </Label>
      <textarea
        id={id}
        name={id}
        rows={sorok}
        maxLength={max}
        value={ertek}
        onChange={(e) => valtozik(e.target.value)}
        className={MEZO}
        data-testid={id}
      />
      <Text className="txt-compact-small text-ui-fg-muted self-end">
        {ertek.length}/{max}
      </Text>
    </div>
  )
}

/**
 * A VEVO KET MEGJEGYZESE (kartya d3b54954): a boltnak, es hazhoz szallitasnal
 * a futarnak. A szallitasi lepes alatt all; a mentes a "Tovabb a fizeteshez"
 * gombon tortenik (`mentsMegjegyzeseket`).
 */
export default function RendelesMegjegyzes({ ertek, valtozik, hazhoz }: Props) {
  return (
    <div
      className="flex flex-col gap-y-4 mb-6"
      data-testid="rendeles-megjegyzes"
    >
      <Mezo
        id="megjegyzes-vevo"
        cimke="Megjegyzés a rendeléshez"
        ertek={ertek.vevo}
        max={VEVO_MEGJEGYZES_MAX}
        sorok={3}
        valtozik={(vevo) => valtozik({ ...ertek, vevo })}
      />
      {hazhoz && (
        <Mezo
          id="megjegyzes-futar"
          cimke="Üzenet a futárnak"
          ertek={ertek.futar}
          max={FUTAR_MEGJEGYZES_MAX}
          sorok={2}
          valtozik={(futar) => valtozik({ ...ertek, futar })}
        />
      )}
    </div>
  )
}
