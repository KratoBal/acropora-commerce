const checkEnvVariables = require("./check-env-variables")
const { belsoAtirasok, termekUtAtiranyitasok } = require("./belso-utvonalak")

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
  /*
    A LAP-GENERALAS IDOKORLATJA 180 MP (kartya 62811c0f, barracuda atvetele).
    A build kozbeni ujraprobalas (`lib/util/epites-ujraprobalas.ts`) 2+4+8+16+30
    = 60 mp-et var, plusz a kerések ideje. A Next alapertelmezett korlatja
    pont 60 mp: hosszu kiesesnel a Next elobb lone le a lapot a sajat
    timeout-hibajaval, mint ahogy a burkolo megnevezve feladna. A korlat
    tehat a burkolo kerete FOLE kell; egy valodi kiesesnel a build igy is bukik.
  */
  staticPageGenerationTimeout: 180,
  // FE-7 3. resz: a `?v_id` es a `?page` belso utvonalra (ISR), a szurok a
  // dinamikus `_szurt` utra. Az indok es a meres: `belso-utvonalak.js`.
  async rewrites() {
    return { beforeFiles: belsoAtirasok() }
  },
  // SEO P0 PR 7d (G2): a termeklap cime `/hu/termek/{slug}`. A regi `/products/`
  // alak (a teszt bolt mai linkjei) egy 301-gyel jon at; a ket szabaly a
  // middleware ELOTT fut, tehat az orszag nelkuli alak sem lesz ket ugras.
  async redirects() {
    return termekUtAtiranyitasok()
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
    /*
     * CSAK EZ A KET MINOSEG (barracuda #525 review): a `q` parameter kulonben
     * szabad, es a 31 napos tarolas mellett minden szelesseg x minoseg egy uj
     * bejegyzes lenne kivulrol. Az 50 a listakepeke (`Thumbnail`), a 75 a Next
     * alapertelmezese (a `getImageProps` hivok).
     */
    qualities: [50, 75],
    /*
     * CSAK A SAJAT KEPHOSZTOK (barracuda #525 review). Az optimalizalo
     * bekapcsolasaval a starter regi mintai elesedtek volna: barmely S3-bucket
     * (`*.s3.*.amazonaws.com`, `*.s3.amazonaws.com`) es a port nelkuli
     * `localhost`. A `/_next/image` igy nyilt kepproxy lett volna a mi
     * `sharp`-unkkal, a `localhost` fele pedig port-tapogathato felulet.
     * A `localhost` csak fejlesztesben marad; a Medusa Cloud S3 csak pontos
     * hoszttal es uttal (env-bol). A lista rogzitve: `next-config-kepek.spec.ts`.
     */
    remotePatterns: [
      ...(MEDUSA_KEPHOSZT ? [MEDUSA_KEPHOSZT] : []),
      ...(process.env.NODE_ENV === "production"
        ? []
        : [{ protocol: "http", hostname: "localhost" }]),
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
