/*
 * FIGYELEM: EZ A KONFIG HALOTT, ES A BEKOTESE KART OKOZNA.
 *
 * Merve 2026-09-10: a `next-sitemap` csomag NINCS a fuggosegek kozott, egyetlen szkript sem
 * futtatja (a build csak `next build`), a `siteUrl` pedig a `NEXT_PUBLIC_VERCEL_URL`
 * valtozobol jon, amit nem hasznalunk. A `public/` mappaban egyetlen fajl all, a favicon --
 * generalt kimenet tehat sincs.
 *
 * ES A LENYEG: a lenti hazirend `allow: "/"`. Aki ezt "bekoti" (telepiti a csomagot es
 * betesz egy postbuildet), a TESZT boltra publikal egy MINDENT ENGEDO robots.txt-t.
 *
 * A `/robots.txt` MA MASHOL dol el: `src/app/robots.ts`, hosztnev szerint (nev szerinti
 * lista az eles hosztokrol, minden mas `Disallow: /`). Ha a sitemap egyszer kell, azt is
 * ott kell megirni (`src/app/sitemap.ts`), nem itt feltamasztani.
 *
 * A fajl azert MARAD, es nem torlodik: a torles nyomtalan, ez a figyelmeztetes viszont
 * pontosan azt olvassa el, aki bekotné.
 */

const excludedPaths = ["/checkout", "/account/*"]

module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_VERCEL_URL,
  generateRobotsTxt: true,
  exclude: excludedPaths + ["/[sitemap]"],
  robotsTxtOptions: {
    policies: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "*",
        disallow: excludedPaths,
      },
    ],
  },
}
