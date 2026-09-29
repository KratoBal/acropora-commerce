import {
  SIMPLEPAY_ADATKEZELESI_TAJEKOZTATO,
  SIMPLEPAY_FIZETESI_TAJEKOZTATO,
  SIMPLEPAY_LOGO,
  SIMPLEPAY_NYILATKOZAT,
} from "@lib/util/simplepay-nyilatkozat"

/**
 * A SIMPLEPAY LOGO ES AZ ADATTOVABBITASI NYILATKOZAT a fizetesi lepesben, a
 * bankkartyas mod alatt (P4-4, Balazs igene 2026-09-29 21:05 UTC).
 *
 * - A logo nem atlatszo es link a Fizetesi Tajekoztatora (7. fejezet).
 * - A nyilatkozat jelolonegyzet: a vevo kifejezetten fogadja el (8. fejezet).
 *
 * A mai penztar kinezeteben all, nem a Figma-terv szerint: a penztar
 * atrajzolasa kulon szora var.
 */
const SimplePayNyilatkozat = ({
  elfogadva,
  onValtozas,
}: {
  elfogadva: boolean
  onValtozas: (elfogadva: boolean) => void
}) => (
  <div className="mt-4 flex flex-col gap-y-3" data-testid="simplepay-nyilatkozat">
    <a
      href={SIMPLEPAY_FIZETESI_TAJEKOZTATO}
      target="_blank"
      rel="noopener noreferrer"
      data-testid="simplepay-logo-link"
      className="self-start bg-white"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={SIMPLEPAY_LOGO}
        width={300}
        height={40}
        alt="SimplePay vásárlói tájékoztató"
        title="SimplePay - Online bankkártyás fizetés"
      />
    </a>
    <label className="flex items-start gap-x-2 txt-small text-ui-fg-subtle">
      <input
        type="checkbox"
        className="mt-1"
        checked={elfogadva}
        onChange={(esemeny) => onValtozas(esemeny.target.checked)}
        data-testid="simplepay-nyilatkozat-jelolo"
      />
      <span>
        {SIMPLEPAY_NYILATKOZAT}{" "}
        <a
          href={SIMPLEPAY_ADATKEZELESI_TAJEKOZTATO}
          target="_blank"
          rel="noopener noreferrer"
          className="text-ui-fg-interactive underline"
        >
          {SIMPLEPAY_ADATKEZELESI_TAJEKOZTATO}
        </a>
      </span>
    </label>
  </div>
)

export default SimplePayNyilatkozat
