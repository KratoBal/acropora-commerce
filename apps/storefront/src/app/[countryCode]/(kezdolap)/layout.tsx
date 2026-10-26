import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import AruhazKeret from "@modules/layout/templates/aruhaz-keret"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

/**
 * A KEZDOLAP ELRENDEZESE (Balazs, 2026-10-20): a Claude Design terv fejlece es
 * lenyilo menuje. 2026-10-26 ota ugyanezt a keretet kapja minden publikus lap
 * (`(main)/layout.tsx` is), tehat itt mar nincs sajat vaz: a ketto nem
 * csuszhat szet. A fejlec szovegei a lap savjaival kozos, szerkesztheto
 * rekordbol jonnek (a lekeres gyorsitotarazott, a lappal kozos cimkevel).
 */
export default async function KezdolapElrendezes(props: {
  children: React.ReactNode
  params: Promise<{ countryCode: string }>
}) {
  const { countryCode } = await props.params

  return <AruhazKeret countryCode={countryCode}>{props.children}</AruhazKeret>
}
