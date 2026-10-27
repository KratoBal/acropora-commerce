import { FIZETESI_MODOK, FIZETESI_MODOK_CIM } from "./regi-bolt-szovegek"

/**
 * A FIZETES OLDALA (`/hu/fizetes`, commerce-audit-p1, lablec): a lablec
 * "Fizetés" linkje eddig a regi UNAS bolt `shop_contact.php?tab=payment`
 * oldalara mutatott. A szoveg a regi oldalé, szo szerint (`regi-bolt-szovegek.ts`,
 * forras es datum ott). Nem talalunk ki uj szoveget.
 */
export function FizetesLap({ cim }: { cim: string }) {
  return (
    <div className="min-h-[calc(100vh-64px)] bg-acr-mist py-10 small:py-14">
      <div
        className="content-container flex max-w-[760px] flex-col gap-8"
        data-testid="fizetes"
      >
        <h1 className="text-[30px] font-normal leading-[36px] text-acr-ink small:text-[38px] small:leading-[46px]">
          {cim}
        </h1>
        <h2 className="text-[22px] font-normal text-acr-ink">
          {FIZETESI_MODOK_CIM}
        </h2>
        <ul className="flex flex-col gap-4">
          {FIZETESI_MODOK.map((mod) => (
            <li
              key={mod.nev}
              className="border border-acr-line bg-acr-white px-5 py-5 text-[15px] text-acr-ink small:px-8 small:py-6"
              data-testid="fizetesi-mod"
            >
              <p className="font-semibold">{mod.nev}</p>
              {mod.tajekoztato ? (
                <p className="mt-2">
                  <a
                    href={mod.tajekoztato.href}
                    className="underline"
                    target="_blank"
                    rel="nofollow noopener noreferrer"
                  >
                    {mod.tajekoztato.szoveg}
                  </a>
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
