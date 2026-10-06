import {
  SHOP_ADDRESS,
  SHOP_HOURS,
  SPLIT_LEAD,
  SPLIT_PAYMENT,
  SPLIT_PICKUP,
  SPLIT_REASON,
  SPLIT_TITLE,
  type SplitFizetes,
} from "./pickup-notice"

/**
 * A KÉT RENDELÉS SÁVJA (P4-2; Balázs, 2026-09-29): a kosárban és a pénztárban
 * jól láthatóan kimondja, hogy az élő állat miatt két rendelés keletkezik, és
 * megnevezi, melyik tétel kerül a bolti átvételesbe.
 *
 * A mai kinézetben, az átvételi sáv (`PickupNotice`) formáján: új terv nincs
 * hozzá, és a kosár átrajzolása külön szóra vár. Ténykozlés, nem tiltás.
 */
export default function SplitNotice({
  lines,
  visible = true,
  fizetes = null,
}: {
  lines: readonly string[]
  visible?: boolean
  fizetes?: SplitFizetes
}) {
  if (!visible) return null

  return (
    <section
      className="flex flex-col gap-2 p-4 border"
      style={{
        borderColor: "var(--terv-keret-meleg)",
        background: "var(--terv-hatter-lap)",
      }}
      data-testid="split-notice"
    >
      <span
        className="text-[10.5px] font-semibold uppercase tracking-wide"
        style={{ color: "var(--terv-kiemel-tinta)" }}
      >
        {SPLIT_TITLE}
      </span>
      <p className="text-[15px] font-semibold" data-testid="split-notice-lead">
        {SPLIT_LEAD}
      </p>
      <p
        className="text-[12.5px] leading-relaxed font-kiemelt"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        {SPLIT_REASON} {SPLIT_PICKUP}
      </p>
      <p
        className="text-[12.5px] leading-relaxed font-kiemelt"
        style={{ color: "var(--terv-szoveg-halvany)" }}
        data-testid="split-notice-payment"
      >
        {SPLIT_PAYMENT[fizetes ?? "nincs"]}
      </p>
      {lines.length > 0 && (
        <ul
          className="text-[12.5px] leading-relaxed list-disc pl-5"
          style={{ color: "var(--terv-szoveg-halvany)" }}
          data-testid="split-notice-lines"
        >
          {lines.map((cim) => (
            <li key={cim}>{cim} · a boltban veszed át</li>
          ))}
        </ul>
      )}
      <div
        className="flex flex-wrap gap-x-7 gap-y-1 text-[13.5px]"
        style={{ color: "var(--terv-szoveg-halvany)" }}
      >
        <span>{SHOP_ADDRESS}</span>
        <span>{SHOP_HOURS}</span>
      </div>
    </section>
  )
}
