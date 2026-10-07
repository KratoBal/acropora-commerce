const checkEnvVariables = require("./check-env-variables")
const { belsoAtirasok } = require("./belso-utvonalak")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * A KEPEK HOSZTJA: A MEDUSA HATTER (FE-3). Merve 2026-10-07 a teszt kirakaton:
 * mind a 49 termekkep `https://commerce-stage.acropora.hu/static/...`, amit a
 * `remotePatterns` eddig nem fedett le (az `unoptimized: true` miatt nem is
 * kellett). A hoszt a hatter cimebol jon, igy a teszt es az eles bolt kulon
 * bejegyzes nelkul is helyes; csak a `/static/` utvonal, mas nem.
 */
const MEDUSA_KEPHOSZT = (() => {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ?? "")
    return {
      protocol: url.protocol.replace(":", ""),
      hostname: url.hostname,
      ...(url.port ? { port: url.port } : {}),
      pathname: "/static/**",
    }
  } catch {
    return null
  }
})()

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // FE-7 3. resz: a `?v_id` es a `?page` belso utvonalra (ISR), a szurok a
  // dinamikus `_szurt` utra. Az indok es a meres: `belso-utvonalak.js`.
  async rewrites() {
    return { beforeFiles: belsoAtirasok() }
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    /*
     * FE-3 (acrobot 27539): a webshop sajat kepoptimalizaloja, `sharp` a
     * storefront kontenerben; nem az OS gyart elore valtozatot. Az
     * `unoptimized: true` itt korabban minden kepet eredeti meretben kuldott,
     * `srcset` nelkul.
     */
    // csak WebP (a Next alapertelmezese): az AVIF kodolas a sharp-pal sokkal
    // tobb CPU, es egyetlen storefront peldany fut; a forraskepek is WebP-k
    /*
     * A kiszolgalt valtozat 31 napig tarolhato (az alapertelmezes 60 mp). A
     * termekkep cime a feltoltes idobelyeget viseli (`/static/<ms>-<nev>`),
     * tehat egy cim tartalma nem valtozik: uj kep uj cimet kap. Igy egy
     * valtozatot a sharp egyszer szamol ki, nem percenkent ujra.
     */
    minimumCacheTTL: 2678400,
    remotePatterns: [
      ...(MEDUSA_KEPHOSZT ? [MEDUSA_KEPHOSZT] : []),
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        protocol: "https",
        hostname: "*.s3.*.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "*.s3.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
    ],
  },
}

module.exports = nextConfig
