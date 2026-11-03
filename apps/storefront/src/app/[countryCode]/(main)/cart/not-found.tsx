import { Metadata } from "next"

import NincsOldal from "@modules/common/components/nincs-oldal"

export const metadata: Metadata = {
  title: "404",
  description: "Hiba történt",
}

export default function NotFound() {
  return <NincsOldal kosar />
}
