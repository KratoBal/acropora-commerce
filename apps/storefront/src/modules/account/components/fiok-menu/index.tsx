"use client"

import { useParams, usePathname } from "next/navigation"

import { signout } from "@lib/data/customer"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

import { FIOK_PONTOK, aktivPont, fiokCim } from "./pontok"

/**
 * A FIOK FEJE (257:17): "FIÓKOM" felulcim es a lap cime. Mobilon (257:218)
 * nincs felulcim, a cim 600/25.
 */
export function FiokFej() {
  const utvonal = usePathname() ?? ""
  const { countryCode } = useParams() as { countryCode: string }
  return (
    <div className="flex flex-col gap-[5px]">
      <p className="hidden text-[10.5px] font-semibold uppercase leading-[14px] tracking-[1.1px] text-acr-heritage small:block">
        Fiókom
      </p>
      <h1
        className="text-[25px] font-semibold leading-[33px] text-acr-ink small:text-[34px] small:leading-[44px]"
        data-testid="fiok-cim"
      >
        {fiokCim(utvonal, countryCode)}
      </h1>
    </div>
  )
}

/**
 * A FIOK MENUJE. Asztalon (257:21) 244 px-es oszlop, 46 px-es sorok 2 px
 * kozzel: az aktiv kod (mist) hatteru, CSAK BAL OLDALT 3 px-es rez savval
 * (257:22), 600; a tobbi shell hatteru, keret nelkul (a keretvastagsag 0),
 * 400 pala. Mobilon (257:219) vizszintes fulsor,
 * 28 px-es fulekkel, gorgetheto.
 *
 * A KIJELENTKEZES a keretben nincs, de a fiok funkcioja: a menu alatt all,
 * szovegkent.
 */
export default function FiokMenu() {
  const utvonal = usePathname() ?? ""
  const { countryCode } = useParams() as { countryCode: string }
  const aktiv = aktivPont(utvonal, countryCode)
  const kilepes = () => signout(countryCode)

  return (
    <nav aria-label="Fiók" className="font-acr-sans">
      <ul
        className="flex gap-[6px] overflow-x-auto small:hidden"
        data-testid="mobile-account-nav"
      >
        {FIOK_PONTOK.map((pont) => (
          <li key={pont.href} className="shrink-0">
            <LocalizedClientLink
              href={pont.href}
              aria-current={aktiv === pont.href ? "page" : undefined}
              className={
                "flex h-[28px] items-center border px-2 text-[10.5px] leading-[14px] text-acr-ink " +
                (aktiv === pont.href
                  ? "border-acr-heritage bg-acr-mist font-semibold"
                  : "border-acr-line bg-acr-shell")
              }
            >
              {pont.mobilCimke}
            </LocalizedClientLink>
          </li>
        ))}
        <li className="shrink-0">
          <button
            type="button"
            onClick={kilepes}
            className="flex h-[28px] items-center px-2 text-[10.5px] leading-[14px] text-acr-slate underline underline-offset-2"
            data-testid="logout-button-mobile"
          >
            Kijelentkezés
          </button>
        </li>
      </ul>

      <div
        className="hidden flex-col gap-4 small:flex"
        data-testid="account-nav"
      >
        <ul className="flex flex-col gap-[2px]">
          {FIOK_PONTOK.map((pont) => (
            <li key={pont.href}>
              <LocalizedClientLink
                href={pont.href}
                aria-current={aktiv === pont.href ? "page" : undefined}
                className={
                  "flex h-[46px] items-center px-3 text-[13.5px] leading-[18px] " +
                  (aktiv === pont.href
                    ? "border-l-[3px] border-acr-heritage bg-acr-mist font-semibold text-acr-ink"
                    : "bg-acr-shell text-acr-slate hover:text-acr-ink")
                }
                data-testid={pont.testId}
              >
                {pont.cimke}
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={kilepes}
          className="self-start px-3 text-[13.5px] leading-[18px] text-acr-slate underline underline-offset-2 hover:text-acr-ink"
          data-testid="logout-button"
        >
          Kijelentkezés
        </button>
      </div>
    </nav>
  )
}
