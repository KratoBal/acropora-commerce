import { NextResponse } from "next/server"

import { currentReleaseInfo } from "@lib/util/release-info"

/**
 * Which build is serving the storefront - the storefront half of the backend's
 * `/health/release`.
 *
 * FORCE-DYNAMIC IS THE WHOLE POINT, not a performance choice. A route handler
 * without it may be rendered once at `next build`, in the builder stage, where
 * neither variable exists - and the build-time answer would then be served
 * forever, looking exactly like "this image does not know its commit".
 *
 * Under `/api`, which the middleware's matcher skips (`src/middleware.ts`), so
 * no country-code redirect gets in the way of a plain `curl`.
 */
export const dynamic = "force-dynamic"

export function GET() {
  return NextResponse.json({ status: "ok", release: currentReleaseInfo() })
}
