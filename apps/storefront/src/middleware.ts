import { HttpTypes } from "@medusajs/types"
import { NextRequest, NextResponse } from "next/server"
import { statikusGyokerUt } from "@lib/util/statikus-utak"
import { belsoUtKivulrol } from "../belso-utvonalak"
import {
  CACHE_AZONOSITO_ELETTARTAM_MP,
  CACHE_AZONOSITO_SUTI,
  cacheAzonositoKell,
} from "@lib/util/cache-azonosito"
import { orszagAtiranyitasKod } from "@lib/util/orszag-atiranyitas"
import {
  ATIRANYITAS_CACHE_CONTROL,
  atiranyitasCelja,
  atiranyitasLista,
} from "@lib/util/atiranyitas"

const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "dk"

const regionMapCache = {
  regionMap: new Map<string, HttpTypes.StoreRegion>(),
  regionMapUpdated: Date.now(),
}

async function getRegionMap(cacheId: string) {
  const { regionMap, regionMapUpdated } = regionMapCache

  if (!BACKEND_URL) {
    throw new Error(
      "Middleware.ts: Error fetching regions. Did you set up regions in your Medusa Admin and define a NEXT_PUBLIC_MEDUSA_BACKEND_URL environment variable.",
    )
  }

  if (
    !regionMap.keys().next().value ||
    regionMapUpdated < Date.now() - 3600 * 1000
  ) {
    // Fetch regions from Medusa. We can't use the JS client here because middleware is running on Edge and the client needs a Node environment.
    const response = await fetch(`${BACKEND_URL}/store/regions`, {
      method: "GET",
      headers: {
        "x-publishable-api-key": PUBLISHABLE_API_KEY!,
      },
      next: {
        revalidate: 3600,
        tags: [`regions-${cacheId}`],
      },
      cache: "force-cache",
    })

    if (!response.ok) {
      throw new Error(`Backend returned ${response.status}`)
    }

    const json = await response.json()

    const { regions } = json

    if (!regions?.length) {
      return new Map<string, HttpTypes.StoreRegion>()
    }

    // Create a map of country codes to regions.
    regions.forEach((region: HttpTypes.StoreRegion) => {
      region.countries?.forEach((c) => {
        regionMapCache.regionMap.set(c.iso_2 ?? "", region)
      })
    })

    regionMapCache.regionMapUpdated = Date.now()
  }

  return regionMapCache.regionMap
}

/**
 * Fetches regions from Medusa and sets the region cookie.
 * @param request
 * @param response
 */
async function getCountryCode(
  request: NextRequest,
  regionMap: Map<string, HttpTypes.StoreRegion | number>,
) {
  let countryCode

  const urlCountryCode = request.nextUrl.pathname.split("/")[1]?.toLowerCase()

  // Cloudflare Workers provides country via request.cf.country
  const cloudflareCountryCode = (
    request as { cf?: { country?: string } }
  ).cf?.country?.toLowerCase()

  // Vercel provides x-vercel-ip-country header
  const vercelCountryCode = request.headers
    .get("x-vercel-ip-country")
    ?.toLowerCase()

  if (urlCountryCode && regionMap.has(urlCountryCode)) {
    countryCode = urlCountryCode
  } else if (cloudflareCountryCode && regionMap.has(cloudflareCountryCode)) {
    countryCode = cloudflareCountryCode
  } else if (vercelCountryCode && regionMap.has(vercelCountryCode)) {
    countryCode = vercelCountryCode
  } else if (regionMap.has(DEFAULT_REGION)) {
    countryCode = DEFAULT_REGION
  } else if (regionMap.keys().next().value) {
    countryCode = regionMap.keys().next().value
  }

  return countryCode
}

/**
 * Middleware to handle region selection.
 */
/*
 * A statikus gyoker-utak dontese kulon fajlban all (`lib/util/statikus-utak.ts`),
 * az indokkal, a meressel es a lista bovitesenek szabalyaval. A middleware egeszet
 * a `middleware.spec.ts` meri (a vitest betolti a `next/server`-t, merve
 * 2026-10-07): ott a valodi valasz statusza es `Location`-je all.
 *
 * A `_next/` alatti utakat (a `_next/data` is) a middleware nem iranyitja at.
 * A matcherben ezt NEM LEHET kizarni: a Next minden matcher ele egy opcionalis
 * `_next/data/<build-id>` elotagot tesz, es a `nextUrl.pathname`-bol le is vagja
 * (merve 2026-10-07, next 15.5, `build/analysis/get-page-static-info.js`). Ezert
 * a feltetel a NYERS `request.url`-t nezi, nem a `nextUrl`-t.
 */
export async function middleware(request: NextRequest) {
  if (
    statikusGyokerUt(request.nextUrl.pathname) ||
    new URL(request.url).pathname.startsWith("/_next/")
  ) {
    return NextResponse.next()
  }

  // FE-7 3. resz: a belso ut (`/_v`, `/_p`, `/_szurt`) csak a `next.config`
  // atirasan at erheto el. A middleware az EREDETI cimet latja, tehat ez csak
  // a kozvetlen hivast zarja (`belso-utvonalak.js`).
  if (belsoUtKivulrol(request.nextUrl.pathname)) {
    return new NextResponse(null, { status: 404 })
  }

  // SEO P0 PR 7c: a régi cím 301-e, az országkód-átirányítás ELŐTT, hogy a régi
  // UNAS-cím egy lépésben érjen célba. A forrás query-je a célra megy (`utm_…`).
  if (BACKEND_URL && PUBLISHABLE_API_KEY) {
    const cel = atiranyitasCelja(
      await atiranyitasLista(BACKEND_URL, PUBLISHABLE_API_KEY),
      request.nextUrl.pathname,
    )
    if (cel) {
      const valasz = NextResponse.redirect(
        new URL(`${cel.cel}${request.nextUrl.search}`, request.nextUrl.origin),
        cel.statusz,
      )
      valasz.headers.set("Cache-Control", ATIRANYITAS_CACHE_CONTROL)
      return valasz
    }
  }

  const cacheIdCookie = request.cookies.get("_medusa_cache_id")
  const cacheId = cacheIdCookie?.value || crypto.randomUUID()

  const regionMap = await getRegionMap(cacheId)
  const countryCode = await getCountryCode(request, regionMap)

  // if the country code is available, use it, otherwise use the default region
  const country = countryCode || DEFAULT_REGION
  const firstPathSegment = request.nextUrl.pathname.split("/")[1]?.toLowerCase()
  const urlHasCountry = firstPathSegment === country.toLowerCase()

  if (urlHasCountry) {
    // FE-7 3. resz: csak annak, akinek kosara vagy belepese van; a publikus
    // lap valasza igy `Set-Cookie` nelkul megy (`cache-azonosito.ts`).
    if (cacheAzonositoKell(request.cookies)) {
      const response = NextResponse.next()
      response.cookies.set(CACHE_AZONOSITO_SUTI, cacheId, {
        maxAge: CACHE_AZONOSITO_ELETTARTAM_MP,
      })
      // a `Set-Cookie`-s valaszt kozbulso tar ne tarolja: kulonben ugyanazt a
      // cache-azonositot adna ki mindenkinek (barracuda elozetes review, 4.)
      response.headers.set("Cache-Control", "private, no-store")
      return response
    }
    return NextResponse.next()
  }

  // if the url doesn't have the country, redirect to it
  const redirectPath =
    request.nextUrl.pathname === "/" ? "" : request.nextUrl.pathname
  const queryString = request.nextUrl.search || ""
  const redirectUrl = `${request.nextUrl.origin}/${country}${redirectPath}${queryString}`

  // 301, ha a cel mindenkinek ugyanaz (egy orszag) ES letezo lap; kulonben 307
  return NextResponse.redirect(
    redirectUrl,
    orszagAtiranyitasKod(regionMap.size, request.nextUrl.pathname),
  )
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
