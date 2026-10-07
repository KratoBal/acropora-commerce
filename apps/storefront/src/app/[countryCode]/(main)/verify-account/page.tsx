import { Metadata } from "next"
import { Suspense } from "react"

import VerifyAccount from "@modules/account/components/verify-account"

export const metadata: Metadata = {
  title: "E-mail-cím megerősítése",
  description: "Erősítsd meg az e-mail-címedet a regisztráció befejezéséhez.",
}

export default function VerifyAccountPage() {
  return (
    <div className="w-full flex justify-center px-8 py-12">
      <Suspense
        fallback={
          <p className="text-base-regular text-ui-fg-base">
            Verifying your email...
          </p>
        }
      >
        <VerifyAccount />
      </Suspense>
    </div>
  )
}
