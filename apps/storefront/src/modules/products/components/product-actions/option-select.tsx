import { HttpTypes } from "@medusajs/types"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

/**
 * A MASODLAGOS MAGYARAZO SOR AZ ERTEK METAADATABOL JON -- ES MA SEHOL NINCS.
 *
 * A terv minden opcio-dobozban ket sort mutat: a NEVET felkoverrel, alatta egy
 * magyarazo sort ("160 W" / "60-90 cm"). A terv sajat szabalya szerint a
 * masodik sor ELMARAD, ha az opcionak nincs ilyen adata.
 *
 * MERVE 2026-09-10 a stage bolton: az ertek-metaadat mind az 1492 termeknel
 * URES (a mezo jelen van, a tartalma nem). Vagyis ez a sor MA EGYETLEN lapon
 * sem jelenik meg.
 *
 * AZERT VAN MEGIS MEGIRVA, ES AZERT NEM TOBB ANNAL: a terv szabalya keszen all
 * ("ha nincs adat, a sor elmarad"), tehat nem en talalom ki a viselkedest.
 * Amit NEM csinalok: nem talalok ki forrast hozza (nem a leirasbol hamozom ki,
 * nem a nevbol vagom le), mert az kitalalt adat lenne a vevo elott.
 */
function magyarazoSor(ertek: HttpTypes.StoreProductOptionValue): string | null {
  const m = (ertek.metadata ?? null) as Record<string, unknown> | null
  const s = m?.leiras ?? m?.description
  return typeof s === "string" && s.trim() ? s.trim() : null
}

/**
 * AZ OPCIO-VALASZTO, A TERV MERET-FORMAJABAN.
 *
 * A mert ertekek a tervfajlbol (2026-09-10, a terv rendereleseből):
 *
 *     cimke              mono, 10.5px, betukoz 0.14em
 *     racs               margin-top 8px, ket egyenlo hasab, gap 8px
 *     kivalasztott pill  padding 12px, keret 2px, 14px, 600-as suly
 *     tobbi pill         padding 12px, keret 1px, 14px
 *     masodlagos sor     margin-top 3px, 12px
 *
 * === KET SZIN NEM EGYEZIK BETURE, ES SZANDEKOSAN NEM VESZUNK FEL UJ TOKENT ===
 *
 *     keret            terv oklch(0.87 0.008 70)   a mi `--terv-keret`-unk 0.88
 *     masodlagos sor   terv oklch(0.45 0.012 60)   a legkozelebbi halvany  0.5
 *
 * Mindketto a masodik tizedesben ter el. Uj tokent felvenni ezert ugyanaz a
 * hiba, amit a rez-tokeneknel mar egyszer elkovettunk: a kovetkezo olvaso nem
 * tudna, melyik a "helyes" keret. A cimke szine es a kivalasztott keret viszont
 * BETURE a `--terv-szoveg-halvany` es a `--terv-szoveg`.
 *
 * === A CIMKE AZ OPCIO-CSOPORT SAJAT NEVE ===
 *
 * A regi alak `{title} választása` volt. A terv a csoport NEVET mutatja
 * ("MÉRET"), toldalek nelkul -- mert a cimke a mezot nevezi meg, nem a
 * muveletet. Tobb csoportnal (Szin, Kivitel) ez az egyetlen, ami
 * megkulonbozteti oket.
 */
const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const ertekek = option.values ?? []

  return (
    <div data-testid="opcio-csoport">
      <div
        style={{
          fontFamily: "var(--terv-betu-mono-lanc)",
          fontSize: "10.5px",
          letterSpacing: "0.14em",
          color: "var(--terv-szoveg-halvany)",
          textTransform: "uppercase",
        }}
        data-testid="opcio-cimke"
      >
        {title}
      </div>
      <div
        className="grid grid-cols-2"
        style={{ marginTop: "8px", gap: "8px" }}
        data-testid={dataTestId}
      >
        {ertekek.map((ertek) => {
          const v = ertek.value ?? ""
          const kivalasztott = v === current
          const magyarazat = magyarazoSor(ertek)

          return (
            <button
              type="button"
              onClick={() => updateOption(option.id, v)}
              key={ertek.id ?? v}
              className="text-left"
              style={{
                padding: "12px",
                border: kivalasztott
                  ? "2px solid var(--terv-szoveg)"
                  : "1px solid var(--terv-keret)",
                fontSize: "14px",
                fontWeight: kivalasztott ? 600 : 400,
                color: "var(--terv-szoveg)",
              }}
              disabled={disabled}
              aria-pressed={kivalasztott}
              data-testid="option-button"
            >
              {v}
              {magyarazat ? (
                <div
                  style={{
                    marginTop: "3px",
                    fontSize: "12px",
                    fontWeight: 400,
                    color: "var(--terv-szoveg-halvany)",
                  }}
                  data-testid="opcio-magyarazat"
                >
                  {magyarazat}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>
    </div>
  )
}

export default OptionSelect
