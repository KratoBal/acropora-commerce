import Image from "next/image"

/**
 * A FOXPOST – PACKETA GROUP HIVATALOS LOGOJA (a Foxpost logokeszlete,
 * exchange/foxpost/foxpost-logokeszlet.pdf: a "LETÖLTÉS" linkek,
 * foxpost.hu/uploads/kepek/foxpost_logo_horizontal_white_p.png, letoltve
 * 2026-10-05). Ujrarajzolas nelkul: a 1080x1080-as vaszonrol csak az atlatszo
 * szel van levagva (889x335), a kepkockak a Foxpost-eiek.
 *
 * A vilagos (feher alapu) valtozat, mert a penztar feher. Kisebb, mint az
 * Acropora jele: a bizalmat tamogatja, nem uralja a feluletet.
 */
export const FOXPOST_LOGO_UT = "/images/foxpost-packeta-group.png"

export default function FoxpostLogo({ className }: { className?: string }) {
  return (
    <Image
      src={FOXPOST_LOGO_UT}
      alt="FOXPOST – Packeta Group"
      width={889}
      height={335}
      className={className}
      data-testid="foxpost-logo"
    />
  )
}
