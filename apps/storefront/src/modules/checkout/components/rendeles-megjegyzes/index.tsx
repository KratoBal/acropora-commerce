"use client"

import {
  FUTAR_MEGJEGYZES_MAX,
  type Megjegyzesek,
  VEVO_MEGJEGYZES_MAX,
} from "@lib/util/megjegyzes"
import { useTranslate } from "@lib/i18n/use-translate"

type Props = {
  ertek: Megjegyzesek
  valtozik: (ertek: Megjegyzesek) => void
  /** A futarnak szolo mezo csak hazhoz szallitasnal latszik. */
  hazhoz: boolean
}

const MEZO =
  "block w-full resize-y border border-acr-line bg-acr-white px-3 py-3 text-[14px] leading-[22px] text-acr-ink outline-none focus:border-acr-ink"

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
  const t = useTranslate()
  return (
    <div className="flex flex-col gap-y-2">
      <label
        htmlFor={id}
        className="text-[12px] font-medium uppercase leading-[16px] tracking-[1.8px] text-acr-slate"
      >
        {cimke}{" "}
        <span className="normal-case tracking-normal">
          {t("checkoutShipping.optional")}
        </span>
      </label>
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
      <p className="self-end text-[12px] leading-[16px] text-acr-slate">
        {ertek.length}/{max}
      </p>
    </div>
  )
}

/**
 * A VEVO KET MEGJEGYZESE (kartya d3b54954): a boltnak, es hazhoz szallitasnal
 * a futarnak. A szallitasi lepes alatt all; a mentes a "Tovabb a fizeteshez"
 * gombon tortenik (`mentsMegjegyzeseket`).
 */
export default function RendelesMegjegyzes({ ertek, valtozik, hazhoz }: Props) {
  const t = useTranslate()
  return (
    <div
      className="mb-6 flex flex-col gap-y-4"
      data-testid="rendeles-megjegyzes"
    >
      <Mezo
        id="megjegyzes-vevo"
        cimke={t("checkoutShipping.noteOrder")}
        ertek={ertek.vevo}
        max={VEVO_MEGJEGYZES_MAX}
        sorok={3}
        valtozik={(vevo) => valtozik({ ...ertek, vevo })}
      />
      {hazhoz && (
        <Mezo
          id="megjegyzes-futar"
          cimke={t("checkoutShipping.noteCourier")}
          ertek={ertek.futar}
          max={FUTAR_MEGJEGYZES_MAX}
          sorok={2}
          valtozik={(futar) => valtozik({ ...ertek, futar })}
        />
      )}
    </div>
  )
}
