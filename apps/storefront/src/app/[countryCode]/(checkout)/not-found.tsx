import InteractiveLink from "@modules/common/components/interactive-link"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "404",
  description: "Hiba történt",
}

export default async function NotFound() {
  return (
    <div className="flex flex-col gap-4 items-center justify-center min-h-[calc(100vh-64px)]">
      <h1 className="text-2xl-semi text-ui-fg-base">Nincs ilyen oldal</h1>
      <p className="text-small-regular text-ui-fg-base">
        A keresett oldal nem található.
      </p>
      <InteractiveLink href="/">Vissza a főoldalra</InteractiveLink>
    </div>
  )
}
